import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { READING_MOCKS } from '../mocks/readingMocks.js';
import { createReadingPrompt, READING_RESPONSE_SCHEMA } from '../prompts/tutorPrompts.js';

export async function handleGenerateReading(req: Request, res: Response) {
  try {
    const { topic = 'Cultura y vida diaria en China', level = 'HSK 2-3' } = req.body;
    const cleanTopic = typeof topic === 'string' && topic.trim() ? topic.trim() : 'Cultura y vida diaria en China';
    const cleanLevel = typeof level === 'string' && level.trim() ? level.trim() : 'HSK 2-3';

    const ai = getGenAI();

    if (!ai) {
      const selected = READING_MOCKS[Math.floor(Math.random() * READING_MOCKS.length)];
      return res.json(selected);
    }

    const prompt = createReadingPrompt(cleanTopic, cleanLevel);

    const response = await ai.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: READING_RESPONSE_SCHEMA,
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating reading:', err);
    return res.json(READING_MOCKS[0]);
  }
}

