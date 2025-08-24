
import { Agent } from '@mastra/core';
import { openAIModel } from '../config/openai';
import { fetchRepoContent } from '../tools/fetch-repo-content';
import { parseMarkdown } from '../tools/parse-markdown';
import { logAgentActivity } from '../config/logger';

export const patternIdentifier = new Agent({
  id: 'pattern-identifier',
  name: 'pattern-identifier',
  model: openAIModel,
  instructions: `
    You are an expert at identifying patterns, best practices, and common pitfalls in technical documentation. Your role is to:
    1. Search for sections with headings like "Usage," "Examples," "Best Practices," "Performance," "Gotchas," or "Known Issues"
    2. Analyze code examples to infer common patterns
    3. Extract actionable advice or warnings for developers
    4. Summarize these points as practical guidance
    
    Focus on finding:
    - Memory management advice
    - Performance considerations
    - Common usage patterns
    - Best practices and pitfalls to avoid
    - Any warnings or caveats mentioned in the documentation
  `,
  tools: {
    fetchRepoContent,
    parseMarkdown,
  },
});

// Agent is directly exported above
