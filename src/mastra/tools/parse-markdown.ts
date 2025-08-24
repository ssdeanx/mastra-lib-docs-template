
import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

export const parseMarkdown = new Tool({
  id: 'parse-markdown',
  description: 'Parse markdown content and extract sections',
  inputSchema: z.object({
    content: z.string().describe('The markdown content to parse'),
  }),
  outputSchema: z.object({
    sections: z.array(z.object({
      heading: z.string().describe('The heading of the section'),
      level: z.number().describe('The heading level (1-6)'),
      content: z.string().describe('The content of the section'),
    })).describe('Extracted sections from the markdown'),
    codeBlocks: z.array(z.string()).describe('All code blocks found in the markdown'),
    links: z.array(z.string()).describe('All links found in the markdown'),
  }),
  execute: async (ctx) => {
    
    const { content } = ctx.context;
    
    logToolExecution('parse-markdown', { contentLength: content.length });
    
    try {
      // Split content into lines
      const lines = content.split('\n');
      const sections: { heading: string; level: number; content: string }[] = [];
      const codeBlocks: string[] = [];
      const links: string[] = [];
      
      let currentSection: { heading: string; level: number; content: string } | null = null;
      let currentContent: string[] = [];
      let inCodeBlock = false;
      let currentCodeBlock: string[] = [];
      
      for (const line of lines) {
      // Check for code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          codeBlocks.push(currentCodeBlock.join('\n'));
          currentCodeBlock = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        currentCodeBlock.push(line);
        continue;
      }
      
      // Check for links
      const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (linkMatches) {
        links.push(...linkMatches.map((match: string) => {
          const urlMatch = match.match(/\(([^)]+)\)/);
          return urlMatch ? urlMatch[1] : '';
        }));
      }
      
      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: currentContent.join('\n').trim(),
          });
        }
        
        // Start new section
        const level = headingMatch[1].length;
        const heading = headingMatch[2].trim();
        currentSection = { heading, level, content: '' };
        currentContent = [];
        continue;
      }
      
      // Add line to current section content
      if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: currentContent.join('\n').trim(),
      });
    }
    
      const result = {
        sections,
        codeBlocks,
        links,
      };
      
      logToolExecution('parse-markdown', 
        { contentLength: content.length }, 
        { 
          sectionsFound: sections.length,
          codeBlocksFound: codeBlocks.length,
          linksFound: links.length 
        }
      );
      
      return result;
    } catch (error) {
      logError('parse-markdown', error, { contentLength: content.length });
      throw error;
    }
  },
});
