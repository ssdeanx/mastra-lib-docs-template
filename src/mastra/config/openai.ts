import { createOpenAI } from '@ai-sdk/openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// OpenAI configuration from environment variables
export const openAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

// Create the OpenAI provider with configuration
export const openAIProvider = createOpenAI({
  apiKey: openAIConfig.apiKey,
  baseURL: openAIConfig.baseURL,
  // Add timeout configurations for reasoning model processing
  headers: {
    'X-Request-Timeout': '600000', // 600 seconds (10 minutes) per call
  },
  fetch: (url, options) => {
    // Add custom fetch with extended timeout for reasoning models
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 600 seconds (10 minutes)

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  },
});

// Export the configured model with timeout settings
export const openAIModel = openAIProvider(openAIConfig.model, {
  // Additional model-specific configurations for reasoning
  reasoningEffort: 'medium',
  structuredOutputs: true,
});