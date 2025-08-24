
import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

export const extractCodePatterns = new Tool({
  id: 'extract-code-patterns',
  description: 'Extract code patterns like class instantiations, method calls, and configuration objects',
  inputSchema: z.object({
    codeBlocks: z.array(z.string()).describe('Array of code blocks to analyze'),
  }),
  outputSchema: z.object({
    instantiations: z.array(z.object({
      className: z.string(),
      description: z.string(),
    })).describe('Class instantiations found in code blocks'),
    methodCalls: z.array(z.object({
      objectName: z.string(),
      methodName: z.string(),
      description: z.string(),
    })).describe('Method calls found in code blocks'),
    configurations: z.array(z.object({
      functionName: z.string(),
      description: z.string(),
    })).describe('Configuration objects found in code blocks'),
  }),
  execute: async (ctx) => {
    
    const { codeBlocks } = ctx.context;
    
    logToolExecution('extract-code-patterns', { codeBlockCount: codeBlocks.length });
    
    try {
      const instantiations: { className: string; description: string }[] = [];
      const methodCalls: { objectName: string; methodName: string; description: string }[] = [];
      const configurations: { functionName: string; description: string }[] = [];
      
      for (const block of codeBlocks) {
      // Look for class instantiations (new ClassName(...))
      const instantiationMatches = block.matchAll(/new\s+([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*\(/g);
      for (const match of instantiationMatches) {
        const className = match[1];
        if (!instantiations.some(i => i.className === className)) {
          instantiations.push({
            className,
            description: `Creates a new instance of ${className}`,
          });
        }
      }
      
      // Look for method calls (object.method(...))
      const methodCallMatches = block.matchAll(/([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*\.\s*([A-Za-z0-9_]+)\s*\(/g);
      for (const match of methodCallMatches) {
        const objectName = match[1];
        const methodName = match[2];
        if (!methodCalls.some(m => m.objectName === objectName && m.methodName === methodName)) {
          methodCalls.push({
            objectName,
            methodName,
            description: `Calls the ${methodName} method on ${objectName}`,
          });
        }
      }
      
      // Look for configuration objects (function({ ... }))
      const configMatches = block.matchAll(/([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\s*\(\s*\{[^}]*\}/g);
      for (const match of configMatches) {
        const functionName = match[1];
        if (!configurations.some(c => c.functionName === functionName)) {
          configurations.push({
            functionName,
            description: `Configures ${functionName} with options`,
          });
        }
      }
    }
    
      const result = {
        instantiations,
        methodCalls,
        configurations,
      };
      
      logToolExecution('extract-code-patterns',
        { codeBlockCount: codeBlocks.length },
        {
          instantiationsFound: instantiations.length,
          methodCallsFound: methodCalls.length,
          configurationsFound: configurations.length
        }
      );
      
      return result;
    } catch (error) {
      logError('extract-code-patterns', error, { codeBlockCount: codeBlocks.length });
      throw error;
    }
  },
});
