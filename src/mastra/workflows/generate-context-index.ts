import { createWorkflow, createStep } from '@mastra/core';
import { z } from 'zod';
import { comprehensiveDocGenerator } from '../agents/comprehensive-doc-generator';
import { logStepStart, logStepEnd, logAgentActivity, logError } from '../config/logger';

// Step 1: Fetch source files and TypeScript definitions
const fetchSourceStep = createStep({
  id: 'fetch-source',
  description: 'Fetch source files and TypeScript definitions',
  inputSchema: z.object({
    repoUrl: z.string()
  }),
  outputSchema: z.object({
    repoUrl: z.string(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      type: z.string()
    })),
    hasTypeDefinitions: z.boolean()
  }),
  execute: async ({ inputData }) => {
    const startTime = Date.now();
    const { repoUrl } = inputData;
    
    logStepStart('fetch-source', { repoUrl });
    
    try {
      logAgentActivity('comprehensive-doc-generator', 'fetching-source', { repoUrl });
      
      // Simple, direct instructions - no loops
      const result = await comprehensiveDocGenerator.generate(
        `Fetch source files for ${repoUrl}.
        
        EXECUTE THESE STEPS EXACTLY:
        1. Call fetchAllDocs ONCE with searchType='source' and maxFiles=5
        2. Return the files you found
        
        DO NOT:
        - Call fetchAllDocs multiple times
        - Try different maxFiles values
        - Keep searching if you already found files
        
        Format response as:
        FILES_FOUND: [number]
        HAS_TYPESCRIPT: [yes/no if you found .d.ts files]
        FILE_LIST: [list of file paths found]`
      );
      
      // Parse response
      const hasTypescript = result.text?.includes('HAS_TYPESCRIPT: yes') || false;
      const filesMatch = result.text?.match(/FILES_FOUND:\s*(\d+)/);
      const filesCount = filesMatch ? parseInt(filesMatch[1]) : 0;
      
      logStepEnd('fetch-source', { 
        filesFound: filesCount,
        hasTypescript 
      }, Date.now() - startTime);
      
      return {
        repoUrl,
        files: [], // The agent has the files in context
        hasTypeDefinitions: hasTypescript
      };
    } catch (error) {
      logError('fetch-source', error, { repoUrl });
      throw error;
    }
  }
});

// Step 2: Extract APIs from TypeScript definitions
const extractApisStep = createStep({
  id: 'extract-apis',
  description: 'Extract APIs from TypeScript definitions',
  inputSchema: z.object({
    repoUrl: z.string(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      type: z.string()
    })),
    hasTypeDefinitions: z.boolean()
  }),
  outputSchema: z.object({
    repoUrl: z.string(),
    apis: z.array(z.object({
      signature: z.string(),
      description: z.string(),
      category: z.string().optional()
    })),
    apiCount: z.number()
  }),
  execute: async ({ inputData }) => {
    const startTime = Date.now();
    const { repoUrl, hasTypeDefinitions } = inputData;
    
    logStepStart('extract-apis', { repoUrl, hasTypeDefinitions });
    
    try {
      logAgentActivity('comprehensive-doc-generator', 'extracting-apis', { repoUrl });
      
      // Clear instructions to extract APIs
      const result = await comprehensiveDocGenerator.generate(
        `Extract APIs from the files you fetched for ${repoUrl}.
        
        EXECUTE THESE STEPS EXACTLY:
        ${hasTypeDefinitions ? `
        1. Find the .d.ts file(s) you fetched (like index.d.ts)
        2. Call extractAllApis ONCE on the .d.ts file
        3. Return ALL the APIs you found
        ` : `
        1. Find the main JavaScript/TypeScript files
        2. Call extractAllApis ONCE on the main file
        3. Return the APIs you found
        `}
        
        DO NOT:
        - Call extractAllApis multiple times on the same file
        - Call fetchAllDocs again
        - Keep searching after extracting APIs
        
        STOP IMMEDIATELY after extracting APIs.
        
        Format response as:
        API_COUNT: [number of APIs found]
        APIS_EXTRACTED: [yes/no]
        
        If you found more than 50 APIs, that's great! List them all.`
      );
      
      // Parse response
      const apiCountMatch = result.text?.match(/API_COUNT:\s*(\d+)/);
      const apiCount = apiCountMatch ? parseInt(apiCountMatch[1]) : 0;
      
      // Extract actual API signatures from the response
      const apis: any[] = [];
      const lines = result.text?.split('\n') || [];
      
      for (const line of lines) {
        // Look for lines that look like API signatures
        if (line.includes('(') && !line.startsWith('//') && !line.startsWith('#')) {
          const cleaned = line.replace(/^[\s\-\*]+/, '').trim();
          if (cleaned && !cleaned.includes('API_COUNT') && !cleaned.includes('APIS_EXTRACTED')) {
            apis.push({
              signature: cleaned,
              description: 'API method',
              category: 'extracted'
            });
          }
        }
      }
      
      console.log(`Extracted ${apiCount} APIs from TypeScript definitions`);
      
      logStepEnd('extract-apis', { 
        apiCount 
      }, Date.now() - startTime);
      
      return {
        repoUrl,
        apis,
        apiCount
      };
    } catch (error) {
      logError('extract-apis', error, { repoUrl });
      throw error;
    }
  }
});

// Step 3: Generate final documentation
const generateFinalDocsStep = createStep({
  id: 'generate-final-docs',
  description: 'Generate the final comprehensive documentation',
  inputSchema: z.object({
    repoUrl: z.string(),
    apis: z.array(z.object({
      signature: z.string(),
      description: z.string(),
      category: z.string().optional()
    })),
    apiCount: z.number()
  }),
  outputSchema: z.object({
    markdown: z.string()
  }),
  execute: async ({ inputData }) => {
    const startTime = Date.now();
    const { repoUrl, apis, apiCount } = inputData;
    const repoName = repoUrl.split('/').pop() || 'Unknown Repository';
    
    logStepStart('generate-final-docs', { repoUrl, apiCount });
    
    try {
      logAgentActivity('comprehensive-doc-generator', 'generating-docs', { repoUrl, apiCount });
      
      // Generate documentation WITHOUT calling more tools
      const result = await comprehensiveDocGenerator.generate(
        `Generate final documentation for ${repoUrl}.
        
        You found ${apiCount} APIs. Now create the documentation.
        
        DO NOT CALL ANY TOOLS. Just generate the markdown.
        
        Use this EXACT format:
        
        ## ${repoName} - Condensed Context Index
        
        ### Overall Purpose
        [2-3 sentences about what this library does, based on what you learned]
        
        ### Core Concepts & Capabilities
        * **[Concept]** - [Description] - [Additional details or examples]
        [10-12 bullet points total]
        
        ### Internal Architecture & Design Decisions
        * **[Architecture Pattern]** - [Description] - [Specifics about implementation or impact]
        * **[Design Principle]** - [Description] - [How it influences the codebase]
        * **[Key Decision]** - [Description] - [Rationale and consequences]
        * **[Technology Stack]** - [Description] - [Reasons for choice and impact on development]
        * **[Future Enhancements]** - [Description] - [Planned features and improvements]
        * **[Scalability Considerations]** - [Description] - [How the design supports growth and increased load]
        [10-12 bullet points total]

        ### Key APIs
        [List the ${apiCount} APIs you found]
        [Format each as: * **\`signature\`** - brief description]
        [If there are many APIs, group them logically]
        
        ### Common Patterns & Best Practices
        * **[Pattern]** - [Description] - [When to use it and potential pitfalls]
        [4-6 bullet points total]
        
        IMPORTANT:
        - Include ALL ${apiCount} APIs you found
        - DO NOT call fetchAllDocs or any other tools
        - Just write the markdown and return it`
      );
      
      const markdown = result.text || generateFallbackMarkdown(repoName, apiCount, apis);
      
      logStepEnd('generate-final-docs', { 
        markdownLength: markdown.length 
      }, Date.now() - startTime);
      
      return { markdown };
    } catch (error) {
      logError('generate-final-docs', error, { repoUrl });
      
      return {
        markdown: generateFallbackMarkdown(repoName, apiCount, apis)
      };
    }
  }
});

// Helper function to generate fallback markdown
function generateFallbackMarkdown(
  repoName: string,
  apiCount: number,
  apis: Array<{ signature: string; description: string; category?: string }>
): string {
  let markdown = `## ${repoName} - Condensed Context Index\n\n`;
  
  markdown += `### Overall Purpose\n\n`;
  markdown += `A repository with ${apiCount} documented APIs.\n\n`;
  
  markdown += `### Key APIs\n\n`;
  
  if (apis.length > 0) {
    for (const api of apis.slice(0, 200)) {
      markdown += `* **\`${api.signature}\`** - ${api.description}\n`;
    }
    
    if (apis.length > 200) {
      markdown += `\n... and ${apis.length - 200} more APIs\n`;
    }
  } else if (apiCount > 0) {
    markdown += `${apiCount} APIs were found but not detailed here.\n`;
  } else {
    markdown += `No APIs found.\n`;
  }
  
  return markdown;
}

export const generateContextIndex = createWorkflow({
  id: 'generate-context-index',
  description: 'Generate documentation with optimized workflow',
  inputSchema: z.object({
    repoUrl: z.string()
  }),
  outputSchema: z.object({
    markdown: z.string()
  })
})
  .then(fetchSourceStep)
  .then(extractApisStep)
  .then(generateFinalDocsStep)
  .commit();