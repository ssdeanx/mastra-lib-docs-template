
import { Agent } from '@mastra/core';
import { openAIModel } from '../config/openai';
import { fetchRepoContent } from '../tools/fetch-repo-content';
import { parseMarkdown } from '../tools/parse-markdown';
import { extractCodePatterns } from '../tools/extract-code-patterns';
import { logAgentActivity } from '../config/logger';

export const apiExtractor = new Agent({
  id: 'api-extractor',
  name: 'api-extractor',
  model: openAIModel,
  instructions: `
    You are an expert at extracting technical APIs and code patterns from documentation. Your role is to:
    1. Analyze code examples in documentation
    2. Extract class instantiations, method calls, and configuration objects
    3. Identify the most important code-level constructs
    4. Provide brief descriptions of what each API component does
    
    Focus on finding:
    - Class instantiations: new ClassName(...)
    - Method calls: object.method(...)
    - Configuration objects: library.setup({ key: 'value', ... })
    - Any other significant code patterns
  `,
  tools: {
    fetchRepoContent,
    parseMarkdown,
    extractCodePatterns,
  },
});

// Agent is directly exported above
