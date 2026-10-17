import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { ENV } from './env.js';

let aiClient: GoogleGenAI | null = null;
let resolvedWorkingModel: string | null = null;

// Sliding window timestamps (ms) for RPM tracking
const callTimestamps: number[] = [];

// LRU + TTL Cache for Gemini JSON responses
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const MAX_CACHE_ENTRIES = 300;
const DEFAULT_TTL_MS = 1000 * 60 * 45; // 45 minutes cache

export function getGenAI(): GoogleGenAI | null {
  const apiKey = ENV.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('your_api_key') || apiKey.includes('tu_clave')) {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}

/**
 * Returns current RPM usage stats
 */
export function getGeminiRpmStats() {
  const now = Date.now();
  while (callTimestamps.length > 0 && now - callTimestamps[0] > 60_000) {
    callTimestamps.shift();
  }
  return {
    callsInLastMinute: callTimestamps.length,
    maxRpm: ENV.GEMINI_MAX_RPM,
    cacheSize: responseCache.size,
    activeModel: resolvedWorkingModel || ENV.GEMINI_MODEL,
  };
}

function makeCacheKey(prefix: string, payload: unknown): string {
  const raw = `${prefix}:${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function getCached(key: string): any | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: any, ttlMs = DEFAULT_TTL_MS): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Waits if needed to respect RPM limits and avoid 429 errors
 */
async function acquireRateLimitSlot(): Promise<boolean> {
  const now = Date.now();
  while (callTimestamps.length > 0 && now - callTimestamps[0] > 60_000) {
    callTimestamps.shift();
  }

  // If below limit, allow immediately
  if (callTimestamps.length < ENV.GEMINI_MAX_RPM) {
    callTimestamps.push(Date.now());
    return true;
  }

  // If oldest call in the 60s window expires within 4.5 seconds, wait for it smoothly
  const oldest = callTimestamps[0];
  const waitMs = 60_050 - (now - oldest);
  if (waitMs > 0 && waitMs <= 4500) {
    await new Promise((r) => setTimeout(r, waitMs));
    const afterWait = Date.now();
    while (callTimestamps.length > 0 && afterWait - callTimestamps[0] > 60_000) {
      callTimestamps.shift();
    }
    callTimestamps.push(afterWait);
    return true;
  }

  // Exceeded RPM window and wait is too long -> signal caller to use local fallback without hitting 429
  console.warn(`[Gemini RPM Guard] Quota protegida (${callTimestamps.length}/${ENV.GEMINI_MAX_RPM} RPM). Usando motor local.`);
  return false;
}

export interface GeminiJsonRequestOptions {
  cacheScope: string;
  contents: any;
  systemInstruction?: string;
  responseSchema: any;
  ttlMs?: number;
  bypassCache?: boolean;
}

/**
 * Centralized Gemini JSON generator with:
 * 1. LRU+TTL Caching (0 RPM for repeated queries)
 * 2. In-flight request deduplication (0 RPM for double-taps on mobile)
 * 3. Sliding-window RPM rate limiter (prevents 429 quota lockouts)
 * 4. Smart sticky model resolution (avoids multi-model retry storms)
 */
export async function generateGeminiJson<T = any>(
  options: GeminiJsonRequestOptions
): Promise<{ data: T; model: string; fromCache: boolean } | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const cacheKey = makeCacheKey(options.cacheScope, {
    c: options.contents,
    s: options.systemInstruction || '',
  });

  if (!options.bypassCache) {
    const hit = getCached(cacheKey);
    if (hit) {
      return {
        data: hit as T,
        model: resolvedWorkingModel || ENV.GEMINI_MODEL,
        fromCache: true,
      };
    }
  }

  // Deduplicate identical concurrent requests (e.g. accidental double-click on mobile)
  const existingFlight = inFlightRequests.get(cacheKey);
  if (existingFlight) {
    return existingFlight;
  }

  const taskPromise = (async () => {
    try {
      const hasSlot = await acquireRateLimitSlot();
      if (!hasSlot) {
        return null;
      }

      // Sticky model priority: use verified working model first, fallback only on 404
      const primaryModel = resolvedWorkingModel || ENV.GEMINI_MODEL || 'gemini-3.1-flash-lite';
      const fallbackModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.0-flash'].filter(
        (m) => m !== primaryModel
      );
      const modelsToTry = [primaryModel, ...fallbackModels];

      for (let i = 0; i < modelsToTry.length; i++) {
        const modelName = modelsToTry[i];
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: options.contents,
            config: {
              ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
              responseMimeType: 'application/json',
              responseSchema: options.responseSchema,
            },
          });

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text) as T;
            resolvedWorkingModel = modelName; // Sticky cache of working model!
            if (!options.bypassCache) {
              setCached(cacheKey, parsed, options.ttlMs ?? DEFAULT_TTL_MS);
            }
            return {
              data: parsed,
              model: modelName,
              fromCache: false,
            };
          }
        } catch (err: any) {
          const status = err?.status || err?.httpStatusCode || 0;
          const msg = String(err?.message || '');

          // CRITICAL: If rate-limited (429), DO NOT retry with other models immediately!
          if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
            console.warn(`[Gemini 429 Rate Limit] Deteniendo reintentos en cascada para proteger RPM.`);
            return null;
          }

          // Only try fallback model if model name was not found (404) or unsupported
          if (status === 404 || msg.includes('not found') || msg.includes('NOT_FOUND')) {
            console.warn(`[Gemini Model Fallback] Modelo '${modelName}' no disponible, probando '${modelsToTry[i + 1]}'...`);
            continue;
          }

          console.warn(`[Gemini Error] Fallo en ${modelName}:`, msg);
          return null;
        }
      }

      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, taskPromise);
  return taskPromise;
}
