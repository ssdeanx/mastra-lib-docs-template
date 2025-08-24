
import { Agent } from '@mastra/core';
import { openAIModel } from '../config/openai';
import { fetchRepoContent } from '../tools/fetch-repo-content';
import { parseMarkdown } from '../tools/parse-markdown';
import { logAgentActivity } from '../config/logger';

export const documentationAnalyzer = new Agent({
  id: 'documentation-analyzer',
  name: 'documentation-analyzer',
  model: openAIModel,
  instructions: `
    You are an expert at analyzing technical documentation. Your role is to:
    1. Fetch and parse the main README.md file from a GitHub repository
    2. Identify the overall purpose of the project from the introduction
    3. Extract core concepts and capabilities from the documentation
    4. Identify secondary documentation sources like /docs, /examples, or wiki links
    
    Focus on finding:
    - The project's high-level summary or mission statement
    - Headings like "Introduction," "Overview," or "What is [Repo Name]?"
    - Sections with headings like "Features," "Capabilities," or "Core Concepts"
    - Links to additional documentation sources
  `,
  tools: {
    fetchRepoContent,
    parseMarkdown,
  },
});

// Agent is directly exported above
