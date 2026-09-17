import { UserProfile } from '../types/index.js';

const STORAGE_KEY = 'li_ming_user_profile';
const PROFILE_UPDATED_EVENT = 'li_ming_profile_updated';

export const DEFAULT_USER_PROFILE: UserProfile = {
  hskLevel: 'HSK 2',
  hskkLevel: 'HSKK Inicial',
  overallScore: 70,
  skillScores: {
    conversational: 68,
    reading: 72,
    fluency: 70,
    intonation: 65,
  },
  strengths: [
    'Disposición activa para hablar e interactuar en situaciones cotidianas',
    'Reconocimiento del vocabulario esencial de cortesía, presentaciones y compras',
    'Buena comprensión lectora de oraciones simples con apoyo de pinyin',
  ],
  weaknesses: [
    'Vacilación en la distinción entre consonantes retroflejas (zh, ch, sh, r) y dentales (z, c, s)',
    'Respuestas conversacionales orales compuestas por frases muy breves o aisladas',
    'Mantenimiento del ritmo y pausas naturales en frases de más de 12 caracteres',
  ],
  pedagogicalRecommendations: [
    'Realiza ejercicios de Shadowing imitando de inmediato la melodía y pausas nativas.',
    'Intenta formular oraciones con conectores simples como 因为...所以 (porque... por eso).',
    'Practica la lectura en voz alta a velocidad moderada prestando atención a los tonos 2º y 3º.',
  ],
  lastEvaluatedAt: undefined,
};

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PROFILE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.hskLevel && parsed.hskkLevel) {
      return {
        ...DEFAULT_USER_PROFILE,
        ...parsed,
        skillScores: {
          ...DEFAULT_USER_PROFILE.skillScores,
          ...(parsed.skillScores || {}),
        },
      };
    }
  } catch (err) {
    console.warn('Could not read user profile from localStorage:', err);
  }

  return DEFAULT_USER_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;

  try {
    const dataToSave = {
      ...profile,
      lastEvaluatedAt: profile.lastEvaluatedAt || new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, { detail: dataToSave })
    );
  } catch (err) {
    console.error('Failed to save user profile to localStorage:', err);
  }
}

/**
 * Returns a high-signal pedagogical context string to be embedded in internal AI prompts
 */
export function getProfilePromptContext(): string {
  const p = getUserProfile();
  return `PERFIL DEL ESTUDIANTE (ADAPTACIÓN DE DIFICULTAD):
- Nivel Oficial: ${p.hskLevel} (General) / ${p.hskkLevel} (Oral Kouyu).
- Fortalezas comunicativas: ${p.strengths.slice(0, 3).join('; ')}.
- Debilidades a desafiar y corregir: ${p.weaknesses.slice(0, 3).join('; ')}.
- Pauta pedagógica: Calibra el vocabulario, las oraciones y los retos fonéticos exactamente para su nivel (${p.hskLevel}), estimulando las áreas de debilidad señaladas sin sobrepasar abruptamente su capacidad de comprensión.`;
}

/**
 * Helper hook / listener to react to profile updates across components
 */
export function subscribeToProfileChanges(callback: (profile: UserProfile) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<UserProfile>;
    callback(customEvent.detail || getUserProfile());
  };

  window.addEventListener(PROFILE_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
  };
}

