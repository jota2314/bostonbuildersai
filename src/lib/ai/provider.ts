// Centralized AI provider and model names for SDK 5
// This keeps model selection consistent across the app

export { openai } from '@ai-sdk/openai';

export const models = {
  default: 'gpt-4o',
  fast: 'gpt-4o-mini',
} as const;



