
import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

export const generateOutput = new Tool({
  id: 'generate-output',
  description: 'Generate the final condensed context index in markdown format',
  inputSchema: z.object({
    repoName: z.string().describe('The name of the repository'),
    repoUrl: z.string().describe('The URL of the repository'),
    purpose: z.string().describe('The overall purpose of the repository'),
    concepts: z.array(z.object({
      name: z.string(),
      description: z.string(),
    })).describe('Core concepts and capabilities'),
    apis: z.array(z.object({
      signature: z.string(),
      description: z.string(),
    })).describe('Key APIs, components, and configuration'),
    patterns: z.array(z.object({
      pattern: z.string(),
      description: z.string(),
    })).describe('Common patterns, best practices, and pitfalls'),
  }),
  outputSchema: z.object({
    markdown: z.string().describe('The generated markdown content'),
  }),
  execute: async (ctx) => {
    
    const { repoName, repoUrl, purpose, concepts, apis, patterns } = ctx.context;
    
    logToolExecution('generate-output', { 
      repoName, 
      repoUrl,
      conceptCount: concepts.length,
      apiCount: apis.length,
      patternCount: patterns.length
    });
    
    try {
      let markdown = `## ${repoName} - Condensed Context Index\n\n`;
    
    // Overall Purpose
    markdown += `## Overall Purpose\n${purpose}\n\n`;
    
    // Core Concepts & Capabilities
    markdown += `## Core Concepts & Capabilities\n`;
    for (const concept of concepts) {
      markdown += `${concept.name} - ${concept.description}\n\n`;
    }
    
    // Key APIs / Components / Configuration
    markdown += `## Key APIs / Components / Configuration\n`;
    for (const api of apis) {
      markdown += `${api.signature} - ${api.description}\n\n`;
    }
    
    // Common Patterns & Best Practices / Pitfalls
    markdown += `## Common Patterns & Best Practices / Pitfalls\n`;
    for (const pattern of patterns) {
      markdown += `${pattern.pattern} - ${pattern.description}\n\n`;
    }
    
    // Concluding remark
    markdown += `This index summarizes the core concepts, APIs, and patterns for ${repoName}. Consult the full source documentation (${repoUrl}) for exhaustive details.\n`;
    
      const result = { markdown };
      
      logToolExecution('generate-output',
        { repoName },
        { 
          markdownLength: markdown.length,
          sectionsGenerated: 4
        }
      );
      
      return result;
    } catch (error) {
      logError('generate-output', error, { repoName, repoUrl });
      throw error;
    }
  },
});
