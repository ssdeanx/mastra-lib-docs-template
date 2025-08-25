// Generated on 2025-06-20 - Enhanced with Gemini 2.5 features
/**
 * Enhanced Google Generative AI Provider Setup for Mastra
 *
 * Comprehensive Google provider with full Gemini 2.5 feature support including:
 * - Search Grounding with Dynamic Retrieval
 * - Cached Content (Implicit & Explicit)
 * - File Inputs (PDF, images, etc.)
 * - Embedding Models with flexible dimensions (1536 default)
 * - Thinking Config via providerOptions (correct AI SDK pattern)
 * - Safety Settings and Response Modalities
 * - Image Generation capabilities
 *
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
 * @see https://ai.google.dev/gemini-api/docs
 *
 * @example Correct thinking config usage:
 * ```typescript
 * const result = await generateText({
 *   model: google('gemini-2.5-flash-lite-preview-06-17'),
 *   providerOptions: {
 *     google: {
 *       thinkingConfig: { thinkingBudget: 2048 }
 *     }
 *   },
 *   prompt: 'Think step by step...'
 * });
 * ```
 */
import {
  google as baseGoogle,
  GoogleGenerativeAIProviderSettings,
  GoogleGenerativeAIProviderOptions,
  GoogleGenerativeAIProviderMetadata
} from '@ai-sdk/google';
import { GoogleAICacheManager } from '@google/generative-ai/server';
import { PinoLogger } from "@mastra/loggers";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = new PinoLogger({ name: 'googleProvider', level: 'info' });


/**
 * Gemini Model Configuration Constants - Focused on 2.5 Series
 */
export const GEMINI_CONFIG = {
  // Latest Gemini 2.5 models with advanced capabilities
  MODELS: {
    // Main model - Latest 2.5 Flash Lite with 1M context, thinking, and all features
    GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite', // Primary model
    GEMINI_2_5_PRO_PREVIEW: 'gemini-2.5-pro-preview-05-06',
    GEMINI_2_5_FLASH_PREVIEW: 'gemini-2.5-flash-preview-05-20',
    GEMINI_2_5_PRO: 'gemini-2.5-pro',
    GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  },

  // Embedding models with dimension support
  EMBEDDING_MODELS: {
    TEXT_EMBEDDING_004: 'models/text-embedding-004', // 768 default, supports custom dimensions
  },

  // Safety settings presets
  SAFETY_PRESETS: {
    STRICT: [
      { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_LOW_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_LOW_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_LOW_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_LOW_AND_ABOVE' as const }
    ],
    MODERATE: [
      { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_MEDIUM_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_MEDIUM_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_MEDIUM_AND_ABOVE' as const },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_MEDIUM_AND_ABOVE' as const }
    ],
    PERMISSIVE: [
      { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
      { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_ONLY_HIGH' as const }
    ],
    OFF: [
      { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_NONE' as const },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_NONE' as const },
      { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_NONE' as const },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_NONE' as const }
    ]
  }
} as const;

/**
 * Supported models for explicit caching (using your current model naming)
 * @see https://ai.google.dev/gemini-api/docs/caching
 */
export type GoogleModelCacheableId =
  | 'gemini-2.5-pro-preview-05-06'     // Your GEMINI_2_5_PRO
  | 'gemini-2.5-flash-preview-05-20'   // Your GEMINI_2_5_FLASH
  | 'gemini-2.5-flash-lite' // Your GEMINI_2_5_FLASH_LITE
  | 'gemini-2.5-pro'            // Standard API format
  | 'gemini-2.5-flash'          // Standard API format
  | 'gemini-2.0-flash'
  | 'gemini-1.5-flash-001'
  | 'gemini-1.5-pro-001';

// Log provider initialization
logger.info('Google provider configuration loaded', {
  defaultModel: GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
  availableModels: Object.keys(GEMINI_CONFIG.MODELS).length,
  embeddingModels: Object.keys(GEMINI_CONFIG.EMBEDDING_MODELS).length
});


/**
 * Enhanced base Google model with Gemini 2.5 Flash Lite as default
 * Supports all advanced features via proper AI SDK patterns
 *
 * @param modelId - Gemini model ID (defaults to 2.5 Flash Lite)
 * @param options - Model configuration options
 * @returns Configured Google model instance
 */
export const baseGoogleModel = (
  modelId: string = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
  options: {
    useSearchGrounding?: boolean;
    dynamicRetrieval?: boolean;
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
    cachedContent?: string;
    structuredOutputs?: boolean;
    // Langfuse tracing options
    agentName?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    traceName?: string;
  } = {}
) => {
  const {
    useSearchGrounding = false,
    dynamicRetrieval = false,
    safetyLevel = 'MODERATE',
    cachedContent,
    structuredOutputs = true,
    // Langfuse tracing options
    agentName,
    tags = [],
    metadata = {},
    traceName
  } = options;

  // Log model configuration
  logger.debug('Creating Google model instance', {
    modelId,
    useSearchGrounding,
    dynamicRetrieval,
    safetyLevel,
    structuredOutputs,
    agentName,
    traceName
  });

  try {
    const model = baseGoogle(modelId, {
      useSearchGrounding,
      dynamicRetrievalConfig: dynamicRetrieval ? {
        mode: 'MODE_DYNAMIC',
        dynamicThreshold: 0.8
      } : undefined,
      safetySettings: [...GEMINI_CONFIG.SAFETY_PRESETS[safetyLevel]],
      cachedContent,
      structuredOutputs
    });

    // Add Langfuse metadata to the model for automatic tracing
    if (agentName || tags.length > 0 || Object.keys(metadata).length > 0) {
      // Attach metadata that Langfuse can pick up
      (model as Record<string, unknown>).__langfuseMetadata = {
        agentName: agentName || 'unknown',
        tags: [
          'mastra',
          'google',
          'gemini-2.5',
          'dean-machines',
          ...(agentName ? [agentName] : []),
          ...tags
        ],
        metadata: {
          modelId,
          provider: 'google',
          framework: 'mastra',
          project: 'dean-machines-rsc',
          agentName: agentName || 'unknown',
          thinkingBudget: 'dynamic',
          safetyLevel,
          useSearchGrounding,
          dynamicRetrieval,
          structuredOutputs,
          timestamp: new Date().toISOString(),
          traceName: traceName || `${agentName || 'agent'}-${modelId}`,
          ...metadata
        }
      };

      logger.info('Google model configured with Langfuse metadata', {
        modelId,
        agentName,
        traceName: traceName || `${agentName || 'agent'}-${modelId}`,
        tagsCount: tags.length
      });
    }

    logger.info('Google model instance created successfully', { modelId, agentName });
    return model;
  } catch (error) {
    logger.error('Failed to create Google model instance', {
      modelId,
      error: error instanceof Error ? error.message : 'Unknown error',
      agentName
    });
    throw error;
  }
};

/**
 * Create Google provider for Gemini 2.5+ models
 *
 * @param modelId - Gemini 2.5+ model ID
 * @param options - Model configuration options
 * @returns Configured Google model
 *
 * @example Basic usage:
 * ```typescript
 * const model = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17');
 * ```
 *
 * @example With thinking config (use in generateText):
 * ```typescript
 * const result = await generateText({
 *   model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17'),
 *   providerOptions: {
 *     google: {
 *       thinkingConfig: { thinkingBudget: 2048 }
 *     }
 *   },
 *   prompt: 'Think step by step...'
 * });
 * ```
 */
export function createGemini25Provider(
  modelId: string = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
  options: {
    // Thinking capabilities (for backward compatibility with existing agents)
    thinkingConfig?: {
      thinkingBudget?: number;
      includeThoughts?: boolean;
    };

    // Response modalities (for backward compatibility)
    responseModalities?: ('TEXT' | 'IMAGE')[];

    // Search and grounding
    useSearchGrounding?: boolean;
    dynamicRetrieval?: boolean;

    // Content and caching
    cachedContent?: string;

    // Safety and structure
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
    structuredOutputs?: boolean;
  } = {}
) {
  // Extract the thinking and response modality options (for backward compatibility)
  const { thinkingConfig, responseModalities, ...baseOptions } = options;

  logger.debug('Creating Gemini 2.5 provider', {
    modelId,
    hasThinkingConfig: !!thinkingConfig,
    responseModalities,
  });

  // Note: thinkingConfig and responseModalities should ideally be used in providerOptions
  // but we accept them here for backward compatibility with existing agent code
  // These parameters are intentionally unused but kept for API compatibility

  return baseGoogleModel(modelId, baseOptions);
}

/**
 * Create Google provider with image generation capabilities
 * @param modelId - Model ID (default: gemini-2.0-flash-exp)
 * @param options - Configuration options
 */
export function createGeminiImageProvider(
  modelId: string = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
  options: {
    useSearchGrounding?: boolean;
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
  } = {}
) {
  const { useSearchGrounding = false, safetyLevel = 'MODERATE' } = options;

  return baseGoogle(modelId, {
    useSearchGrounding,
    safetySettings: [...GEMINI_CONFIG.SAFETY_PRESETS[safetyLevel]]
  });
}

/**
 * Create embedding model with flexible dimensions
 * @param modelId - Embedding model ID
 * @param options - Embedding configuration
 */
export function createGeminiEmbeddingModel(
  modelId: string = GEMINI_CONFIG.EMBEDDING_MODELS.TEXT_EMBEDDING_004,
  options: {
    outputDimensionality?: 768; // Supported dimensions for text-embedding-004
    taskType?: 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING' | 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'QUESTION_ANSWERING' | 'FACT_VERIFICATION' | 'CODE_RETRIEVAL_QUERY';
  } = {}
) {
  const {
    outputDimensionality = 768, // Default to 768 to match your setup
    taskType = 'SEMANTIC_SIMILARITY'
  } = options;

  return baseGoogle.textEmbeddingModel(modelId, {
    outputDimensionality,
    taskType
  });
}

/**
 * Main function - auto-detects model version and uses appropriate provider
 * @param modelId - ID of the Google model to use
 * @param options - Optional settings for the provider
 * @returns Google provider instance
 */
/**
 * Create a Mastra-compatible Google provider with proper thinking config support
 *
 * @param modelId - Gemini model ID
 * @param options - Provider configuration options
 * @returns Configured Google provider
 *
 * @example
 * ```typescript
 * // Basic usage
 * const model = createMastraGoogleProvider();
 *
 * // With thinking config (use in generateText providerOptions)
 * const result = await generateText({
 *   model: createMastraGoogleProvider('gemini-2.5-flash-lite-preview-06-17'),
 *   providerOptions: {
 *     google: {
 *       thinkingConfig: { thinkingBudget: 2048 }
 *     }
 *   },
 *   prompt: 'Explain quantum computing'
 * });
 * ```
 */
export function createMastraGoogleProvider(
  modelId: string = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
  options: {
    // Search and grounding
    useSearchGrounding?: boolean;
    dynamicRetrieval?: boolean;

    // Content and caching
    cachedContent?: string;

    // Safety and structure
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
    structuredOutputs?: boolean;
  } = {}
) {
  // Use the enhanced 2.5 provider for all models
  return createGemini25Provider(modelId, options);
}
/**
 * Main Google provider export - defaults to Gemini 2.5 Flash Lite
 * This is the primary export that should be used throughout the application
 *
 * @example Basic usage:
 * ```typescript
 * import { google } from './googleProvider';
 * const model = google('gemini-2.5-flash-lite-preview-06-17');
 * ```
 *
 * @example With thinking config (correct AI SDK pattern):
 * ```typescript
 * import { generateText } from 'ai';
 * import { google } from './googleProvider';
 *
 * const result = await generateText({
 *   model: google('gemini-2.5-flash-lite-preview-06-17'),
 *   providerOptions: {
 *     google: {
 *       thinkingConfig: { thinkingBudget: 2048 },
 *       responseModalities: ['TEXT']
 *     }
 *   },
 *   prompt: 'Think step by step about quantum computing...'
 * });
 * ```
 */
export const google = createMastraGoogleProvider;

export type { GoogleGenerativeAIProviderOptions, GoogleGenerativeAIProviderSettings, GoogleGenerativeAIProviderMetadata };

// ============================
// EXPLICIT CACHING UTILITIES
// ============================

/**
 * Create explicit cache manager for guaranteed cost savings
 * @param apiKey - Google AI API key (optional, uses env var if not provided)
 * @returns GoogleAICacheManager instance
 *
 * @example
 * ```typescript
 * const cacheManager = createCacheManager();
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export function createCacheManager(apiKey?: string): GoogleAICacheManager {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error('Google AI API key is required for cache manager');
  }
  
  logger.info('Creating Google AI cache manager', { hasApiKey: !!key });
  return new GoogleAICacheManager(key);
}

/**
 * Create cached content for explicit caching
 * @param cacheManager - Cache manager instance
 * @param modelId - Model to cache content for
 * @param contents - Content to cache
 * @param ttlSeconds - Time to live in seconds (default: 5 minutes)
 * @returns Promise resolving to cached content name
 * * @example
 * ```typescript
 * const cacheManager = createCacheManager();
 * const cachedContent = await createCachedContent(
 *   cacheManager,
 *   'gemini-2.5-pro-preview-05-06', // Using your model names
 *   [{ role: 'user', parts: [{ text: 'Context...' }] }],
 *   300
 * );
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export async function createCachedContent(
  cacheManager: GoogleAICacheManager,
  modelId: GoogleModelCacheableId,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  ttlSeconds: number = 300
): Promise<string> {
  try {
    logger.info('Creating cached content', { modelId, ttlSeconds, contentCount: contents.length });
      const { name } = await cacheManager.create({
      model: modelId,
      contents,
      ttlSeconds
    });
    
    if (!name) {
      throw new Error('Failed to create cached content: no name returned');
    }
    
    logger.info('Cached content created successfully', { name, modelId });
    return name;
  } catch (error) {
    logger.error('Failed to create cached content', {
      modelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Enhanced Google model with explicit caching support
 * @param modelId - Cacheable model ID
 * @param options - Enhanced options including cache configuration
 * @returns Configured Google model with caching
 * * @example
 * ```typescript
 * const cacheManager = createCacheManager();
 * const model = await createCachedGoogleModel(
 *   'gemini-2.5-flash-preview-05-20', // Using your model names
 *   {
 *     cacheManager,
 *     cacheContents: [{ role: 'user', parts: [{ text: 'Context...' }] }],
 *     cacheTtlSeconds: 300
 *   }
 * );
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export const createCachedGoogleModel = async (
  modelId: GoogleModelCacheableId,
  options: {
    // Cache configuration
    cacheManager?: GoogleAICacheManager;
    cacheContents?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    cacheTtlSeconds?: number;
    
    // Standard options (preserving your existing function signature)
    useSearchGrounding?: boolean;
    dynamicRetrieval?: boolean;
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
    structuredOutputs?: boolean;
    agentName?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    traceName?: string;
  } = {}
) => {
  const {
    cacheManager,
    cacheContents,
    cacheTtlSeconds = 300,
    ...baseOptions
  } = options;

  if (cacheManager && cacheContents) {
    // Create cached content and return model with cache
    const cachedContent = await createCachedContent(cacheManager, modelId, cacheContents, cacheTtlSeconds);
    logger.info('Using explicit caching for model', { modelId, cachedContent });
    return baseGoogleModel(modelId, { ...baseOptions, cachedContent });
  }

  // Return regular model without caching
  return baseGoogleModel(modelId, baseOptions);
};

/**
 * Utility to validate model supports caching
 * @param modelId - Model ID to validate
 * @returns Boolean indicating cache support
 * * @example
 * ```typescript
 * if (supportsExplicitCaching('gemini-2.5-pro-preview-05-06')) {
 *   // Can use explicit caching with your models
 * }
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export function supportsExplicitCaching(modelId: string): modelId is GoogleModelCacheableId {
  const cacheableModels: GoogleModelCacheableId[] = [
    // Your current model names
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-lite',
    // Standard API format models
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-pro-001'
  ];
  
  return cacheableModels.includes(modelId as GoogleModelCacheableId);
}

// ============================
// SEARCH GROUNDING UTILITIES
// ============================

/**
 * Extract and process search grounding metadata from provider response
 * @param providerMetadata - Provider metadata from generateText response
 * @returns Processed grounding information
 *
 * @example
 * ```typescript
 * const { text, providerMetadata } = await generateText({ model, prompt });
 * const grounding = extractGroundingMetadata(providerMetadata);
 * console.log('Search queries:', grounding?.searchQueries);
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export function extractGroundingMetadata(providerMetadata?: Record<string, unknown>) {
  if (!providerMetadata?.google || typeof providerMetadata.google !== 'object') {
    return null;
  }

  const googleMetadata = providerMetadata.google as GoogleGenerativeAIProviderMetadata;
  const grounding = googleMetadata.groundingMetadata;

  interface GroundingSegment {
    text: string | null;
    startIndex: number | null;
    endIndex: number | null;
  }

  interface GroundingSupport {
    segment: GroundingSegment;
    groundingChunkIndices: number[];
    confidenceScores: number[];
  }

  interface SafetyRating {
    category: string;
    probability: string;
    blocked?: boolean;
  }

  interface GroundingMetadata {
    searchQueries: string[];
    searchEntryPoint: string | null;
    groundingSupports: GroundingSupport[];
    safetyRatings: SafetyRating[];
  }

  interface RawGroundingSupport {
    segment?: {
      text?: string | null;
      startIndex?: number | null;
      endIndex?: number | null;
    };
    segment_text?: string | null;
    groundingChunkIndices?: number[] | null;
    supportChunkIndices?: number[] | null;
    confidenceScores?: number[] | null;
  }

    return {
      searchQueries: grounding?.webSearchQueries || [],
      searchEntryPoint: grounding?.searchEntryPoint?.renderedContent || null,
      groundingSupports: grounding?.groundingSupports?.map((support: RawGroundingSupport): GroundingSupport => ({
        segment: {
          text: support.segment?.text || '',
          startIndex: support.segment?.startIndex ?? 0,
          endIndex: support.segment?.endIndex ?? 0
        },
        groundingChunkIndices: support.groundingChunkIndices ?? [],
        confidenceScores: support.confidenceScores || []
      })) || [],
      safetyRatings: googleMetadata.safetyRatings || []
    } as GroundingMetadata;
}

/**
 * Log cache usage statistics from response metadata
 * @param response - Response object from generateText
 * @param logger - Logger instance
 *
 * @example
 * ```typescript
 * const result = await generateText({ model, prompt });
 * logCacheUsage(result.response, logger);
 * ```
 *
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export function logCacheUsage(response: Record<string, unknown>, logger: PinoLogger) {
  const responseBody = response?.body as Record<string, unknown> | undefined;
  const usageMetadata = responseBody?.usageMetadata as Record<string, unknown> | undefined;  if (usageMetadata?.cachedContentTokenCount && typeof usageMetadata.cachedContentTokenCount === 'number' && 
      usageMetadata.totalTokenCount && typeof usageMetadata.totalTokenCount === 'number') {
    const cacheHitRate = (usageMetadata.cachedContentTokenCount / usageMetadata.totalTokenCount * 100).toFixed(2);

    logger.info('Cache hit detected', {
      cachedTokens: usageMetadata.cachedContentTokenCount,
      totalTokens: usageMetadata.totalTokenCount,
      promptTokens: usageMetadata.promptTokenCount,
      candidatesTokens: usageMetadata.candidatesTokenCount,
      cacheHitRate: `${cacheHitRate}%`,
      costSavings: `~${cacheHitRate}%`
    });
  }
}

/**
 * Enhanced search grounding utility with metadata extraction
 * @param prompt - Search query or prompt
 * @param options - Search grounding configuration
 * @returns Promise with response and extracted grounding metadata
 *
 * @example
 * ```typescript
 * const { model, extractGroundingMetadata } = await searchGroundedGeneration(
 *   'What are the latest AI developments?',
 *   { agentName: 'research-agent' }
 * );
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export async function searchGroundedGeneration(
  prompt: string,
  options: {
    modelId?: string;
    agentName?: string;
    extractMetadata?: boolean;
    safetyLevel?: 'STRICT' | 'MODERATE' | 'PERMISSIVE' | 'OFF';
  } = {}
) {
  const {
    modelId = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
    agentName = 'search-agent',
    extractMetadata = true,
    safetyLevel = 'MODERATE'
  } = options;

  const model = baseGoogleModel(modelId, {
    useSearchGrounding: true,
    dynamicRetrieval: true,
    safetyLevel,
    agentName,
    tags: ['search', 'grounding'],
    traceName: `search-${agentName}`
  });

  try {
    // Return the configured model and helper for metadata extraction
    return {
      model,
      extractGroundingMetadata: (providerMetadata: Record<string, unknown>) => 
        extractMetadata ? extractGroundingMetadata(providerMetadata) : null
    };
  } catch (error) {
    logger.error('Search grounded generation failed', {
      prompt: prompt.substring(0, 100),
      modelId,
      agentName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
