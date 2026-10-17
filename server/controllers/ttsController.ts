import { Request, Response } from 'express';

// In-memory LRU cache for TTS audio buffers to make repeated playback instant
const ttsCache = new Map<string, Buffer>();
const MAX_TTS_CACHE = 150;

export async function handleMandarinTTS(req: Request, res: Response) {
  try {
    const rawText = String(req.query.text || '').trim();
    const cleanText = rawText.replace(/[（\(].*?[）\)]/g, '').trim().slice(0, 200);

    if (!cleanText) {
      return res.status(400).json({ error: 'Text required' });
    }

    const cached = ttsCache.get(cleanText);
    if (cached) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached);
    }

    const encoded = encodeURIComponent(cleanText);
    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encoded}&tl=zh-CN&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'TTS upstream unavailable' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 100) {
      if (ttsCache.size >= MAX_TTS_CACHE) {
        const oldest = ttsCache.keys().next().value;
        if (oldest) ttsCache.delete(oldest);
      }
      ttsCache.set(cleanText, buffer);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err) {
    console.warn('TTS proxy fallback error:', err);
    return res.status(500).json({ error: 'TTS failed' });
  }
}

