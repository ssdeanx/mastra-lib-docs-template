
import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

export const fetchRepoContent = new Tool({
  id: 'fetch-repo-content',
  description: 'Fetch content from a GitHub repository',
  inputSchema: z.object({
    repoUrl: z.string().describe('The GitHub repository URL'),
    filePath: z.string().describe('The file path to fetch (e.g., README.md)'),
  }),
  outputSchema: z.object({
    content: z.string().describe('The raw content of the file'),
    success: z.boolean().describe('Whether the fetch was successful'),
    error: z.string().optional().describe('Error message if fetch failed'),
  }),
  execute: async (ctx) => {
    
    const { repoUrl, filePath } = ctx.context;
    
    logToolExecution('fetch-repo-content', { repoUrl, filePath });
    
    try {
      // Convert GitHub URL to raw content URL
      const baseUrl = repoUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\/$/, '');
      
      // Try main branch first, then master
      const branches = ['main', 'master'];
      let lastError = '';
      
      for (const branch of branches) {
        const rawUrl = `${baseUrl}/${branch}/${filePath}`;
        logToolExecution('fetch-repo-content', { action: 'fetching', rawUrl, branch });
        
        const response = await fetch(rawUrl);
        
        if (response.ok) {
          const content = await response.text();
          const result = {
            content,
            success: true,
          };
          
          logToolExecution('fetch-repo-content', { repoUrl, filePath }, { 
            success: true, 
            contentLength: content.length,
            branch 
          });
          
          return result;
        }
        
        // If 404, don't log as error - it's expected for non-existent files
        if (response.status === 404) {
          lastError = `File not found: ${filePath}`;
        } else {
          lastError = `Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`;
          logError('fetch-repo-content', new Error(lastError), { rawUrl, status: response.status });
        }
      }
      
      // If we get here, both branches failed
      return {
        content: '',
        success: false,
        error: lastError,
      };
    } catch (error) {
      logError('fetch-repo-content', error, { repoUrl, filePath });
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
