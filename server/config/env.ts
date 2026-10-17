import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  GEMINI_MAX_RPM: parseInt(process.env.GEMINI_MAX_RPM || '15', 10),
  GOOGLE_SCRIPT_WEBHOOK_URL: process.env.GOOGLE_SCRIPT_WEBHOOK_URL || '',
  GOOGLE_SCRIPT_API_TOKEN: process.env.GOOGLE_SCRIPT_API_TOKEN || '',
  DISABLE_HMR: process.env.DISABLE_HMR === 'true',
};
