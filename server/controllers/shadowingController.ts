import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { SHADOWING_MOCKS } from '../mocks/shadowingMocks.js';
import { createShadowingPrompt, SHADOWING_RESPONSE_SCHEMA } from '../prompts/tutorPrompts.js';

export async function handleGenerateShadowing(req: Request, res: Response) {
  try {
    const { topic = 'Planes espontáneos de fin de semana' } = req.body;
    const cleanTopic = typeof topic === 'string' && topic.trim() ? topic.trim() : 'Planes espontáneos de fin de semana';

    const ai = getGenAI();

    if (!ai) {
      return res.json(SHADOWING_MOCKS[0]);
    }

    const prompt = createShadowingPrompt(cleanTopic);

    const response = await ai.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: SHADOWING_RESPONSE_SCHEMA,
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating shadowing:', err);
    return res.json(SHADOWING_MOCKS[0]);
  }
}

