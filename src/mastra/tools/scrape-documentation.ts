import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

// Documentation site patterns for intelligent scraping
const SITE_PATTERNS = {
  'react.dev': {
    apiPath: '/reference/react',
    apiListSelector: 'a[href*="/reference/react/"]',
    methodSelector: 'h1, h2, h3',
    signatureSelector: 'pre code, .code-block',
    descriptionSelector: 'p',
    structure: 'react-style'
  },
  'vuejs.org': {
    apiPath: '/api/',
    apiListSelector: '.api-list a, .sidebar-link',
    methodSelector: 'h2, h3',
    signatureSelector: 'pre code',
    descriptionSelector: '.api-description, p',
    structure: 'vue-style'
  },
  'angular.io': {
    apiPath: '/api',
    apiListSelector: '.api-list-item a',
    methodSelector: 'h1.api-header',
    signatureSelector: 'code.api-doc-code',
    descriptionSelector: '.api-body',
    structure: 'angular-style'
  },
  'lodash.com': {
    apiPath: '/docs',
    apiListSelector: '.toc-container a',
    methodSelector: 'h3',
    signatureSelector: 'pre',
    descriptionSelector: '.doc-desc',
    structure: 'lodash-style'
  },
  'expressjs.com': {
    apiPath: '/en/api.html',
    apiListSelector: '#menu a',
    methodSelector: 'h2, h3',
    signatureSelector: 'pre code',
    descriptionSelector: 'p',
    structure: 'express-style'
  },
  'docs.python.org': {
    apiPath: '/3/library/',
    apiListSelector: '.toctree-wrapper a',
    methodSelector: 'dt.sig',
    signatureSelector: '.sig-prename, .sig-name',
    descriptionSelector: 'dd',
    structure: 'python-style'
  },
  'ruby-doc.org': {
    apiPath: '/core/',
    apiListSelector: '#class-index a, #method-index a',
    methodSelector: '.method-heading',
    signatureSelector: '.method-callseq',
    descriptionSelector: '.method-description',
    structure: 'ruby-style'
  },
  'docs.rs': {
    apiPath: '/',
    apiListSelector: '.sidebar-elems a',
    methodSelector: 'h3.code-header',
    signatureSelector: 'pre.rust',
    descriptionSelector: '.docblock',
    structure: 'rust-style'
  },
  'pkg.go.dev': {
    apiPath: '/',
    apiListSelector: '.Documentation-index a',
    methodSelector: 'h3.Documentation-typeFunc',
    signatureSelector: 'pre',
    descriptionSelector: '.Documentation-content p',
    structure: 'go-style'
  },
  'docs.oracle.com': {
    apiPath: '/javase/',
    apiListSelector: '.contentContainer a',
    methodSelector: 'h3.method-heading',
    signatureSelector: 'pre',
    descriptionSelector: '.block',
    structure: 'java-style'
  },
  'readthedocs.io': {
    apiPath: '/en/latest/',
    apiListSelector: '.toctree-wrapper a, .sidebar a',
    methodSelector: 'dt',
    signatureSelector: '.sig',
    descriptionSelector: 'dd',
    structure: 'sphinx-style'
  },
  'developer.mozilla.org': {
    apiPath: '/en-US/docs/',
    apiListSelector: '.sidebar a',
    methodSelector: 'h2, h3',
    signatureSelector: 'pre.syntaxbox',
    descriptionSelector: 'p',
    structure: 'mdn-style'
  }
};

// Generic patterns for unknown documentation sites
const GENERIC_PATTERNS = {
  apiSelectors: [
    'a[href*="api"]',
    'a[href*="reference"]',
    'a[href*="docs"]',
    '.api-link',
    '.method-link',
    '.function-link'
  ],
  methodSelectors: [
    'h1', 'h2', 'h3',
    '.method-name',
    '.function-name',
    '.api-name',
    '[class*="method"]',
    '[class*="function"]'
  ],
  signatureSelectors: [
    'pre code',
    'pre',
    'code.signature',
    '.method-signature',
    '.function-signature',
    '.api-signature',
    '[class*="signature"]'
  ],
  descriptionSelectors: [
    '.description',
    '.method-description',
    '.api-description',
    '.content p',
    'p'
  ]
};

export const scrapeDocumentation = new Tool({
  id: 'scrape-documentation',
  description: 'Scrape API documentation from a website',
  inputSchema: z.object({
    url: z.string().describe('The documentation website URL'),
    maxPages: z.number().optional().describe('Maximum number of pages to scrape'),
    language: z.string().optional().describe('Programming language for context'),
  }),
  outputSchema: z.object({
    apis: z.array(z.object({
      name: z.string(),
      signature: z.string(),
      description: z.string(),
      url: z.string().optional(),
      category: z.string().optional(),
    })).describe('Scraped API methods'),
    pagesScraped: z.number().describe('Number of pages scraped'),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (ctx) => {
    const { url, maxPages = 10, language } = ctx.context;
    
    logToolExecution('scrape-documentation', { url, maxPages, language });
    
    try {
      const apis: any[] = [];
      const visitedUrls = new Set<string>();
      const urlsToVisit: string[] = [url];
      let pagesScraped = 0;
      
      // Determine which patterns to use based on URL
      const sitePattern = Object.entries(SITE_PATTERNS).find(([domain]) => 
        url.includes(domain)
      );
      
      const patterns = sitePattern ? sitePattern[1] : null;
      
      // Helper function to extract text content
      const extractText = (html: string, selector: string): string => {
        // Simple regex-based extraction (in production, use a proper HTML parser)
        const pattern = new RegExp(`<[^>]*(?:class|id)="[^"]*${selector}[^"]*"[^>]*>([^<]+)<`, 'gi');
        const match = html.match(pattern);
        return match ? match[0].replace(/<[^>]+>/g, '').trim() : '';
      };
      
      // Helper function to extract APIs from HTML
      const extractAPIsFromHTML = (html: string, pageUrl: string) => {
        const pageApis: any[] = [];
        
        if (patterns) {
          // Use site-specific patterns
          const methodPattern = new RegExp(`<(${patterns.methodSelector.split(', ').join('|')})[^>]*>([^<]+)<`, 'gi');
          let methodMatch;
          
          while ((methodMatch = methodPattern.exec(html)) !== null) {
            const methodName = methodMatch[2].trim();
            
            // Skip if it's not an API method name
            if (methodName.length < 2 || methodName.length > 100) continue;
            if (!/^[a-zA-Z_$]/.test(methodName)) continue;
            
            // Look for signature and description near the method
            const contextStart = Math.max(0, methodMatch.index - 500);
            const contextEnd = Math.min(html.length, methodMatch.index + 2000);
            const context = html.substring(contextStart, contextEnd);
            
            // Extract signature
            let signature = methodName;
            const sigPattern = new RegExp(`<(?:${patterns.signatureSelector.split(', ').join('|').replace(/\./g, '[^>]*class="[^"]*').replace(/$/g, '[^"]*"')})[^>]*>([^<]+)<`, 'i');
            const sigMatch = context.match(sigPattern);
            if (sigMatch) {
              signature = sigMatch[1].trim();
            }
            
            // Extract description
            let description = '';
            const descPattern = new RegExp(`<(?:${patterns.descriptionSelector.split(', ').join('|').replace(/\./g, '[^>]*class="[^"]*').replace(/$/g, '[^"]*"')})[^>]*>([^<]+)<`, 'i');
            const descMatch = context.match(descPattern);
            if (descMatch) {
              description = descMatch[1].trim().substring(0, 200);
            }
            
            pageApis.push({
              name: methodName,
              signature: signature,
              description: description || 'API method',
              url: pageUrl,
              category: patterns.structure
            });
          }
        } else {
          // Use generic patterns for unknown sites
          // Try each method selector
          for (const selector of GENERIC_PATTERNS.methodSelectors) {
            const pattern = new RegExp(`<[^>]*(?:class|id)="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([^<]+)<`, 'gi');
            let match;
            
            while ((match = pattern.exec(html)) !== null) {
              const methodName = match[1].trim();
              
              // Basic validation
              if (methodName.length < 2 || methodName.length > 100) continue;
              if (!/^[a-zA-Z_$]/.test(methodName)) continue;
              
              // Look for code blocks near this heading
              const contextStart = Math.max(0, match.index);
              const contextEnd = Math.min(html.length, match.index + 1500);
              const context = html.substring(contextStart, contextEnd);
              
              // Find signature in code blocks
              const codePattern = /<(?:pre|code)[^>]*>([^<]+)</i;
              const codeMatch = context.match(codePattern);
              const signature = codeMatch ? codeMatch[1].trim() : methodName;
              
              // Find description in paragraphs
              const paraPattern = /<p[^>]*>([^<]+)</i;
              const paraMatch = context.match(paraPattern);
              const description = paraMatch ? paraMatch[1].trim().substring(0, 200) : '';
              
              pageApis.push({
                name: methodName,
                signature: signature,
                description: description || 'API method',
                url: pageUrl,
                category: 'generic'
              });
            }
          }
        }
        
        return pageApis;
      };
      
      // Helper function to extract links from HTML
      const extractLinks = (html: string, baseUrl: string): string[] => {
        const links: string[] = [];
        const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>/gi;
        let match;
        
        while ((match = linkPattern.exec(html)) !== null) {
          const href = match[1];
          
          // Convert relative URLs to absolute
          let absoluteUrl = href;
          if (href.startsWith('/')) {
            const urlObj = new URL(baseUrl);
            absoluteUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else if (!href.startsWith('http')) {
            const urlObj = new URL(baseUrl);
            const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'));
            absoluteUrl = `${urlObj.protocol}//${urlObj.host}${basePath}/${href}`;
          }
          
          // Filter for API-related links
          if (patterns) {
            if (href.includes(patterns.apiPath) || href.includes('api') || href.includes('reference')) {
              links.push(absoluteUrl);
            }
          } else {
            // For generic sites, look for API-related keywords
            if (href.match(/api|reference|docs|methods|functions|classes/i)) {
              links.push(absoluteUrl);
            }
          }
        }
        
        return links;
      };
      
      // Scrape pages
      while (urlsToVisit.length > 0 && pagesScraped < maxPages) {
        const currentUrl = urlsToVisit.shift()!;
        
        if (visitedUrls.has(currentUrl)) {
          continue;
        }
        
        visitedUrls.add(currentUrl);
        
        try {
          // Fetch the page
          const response = await fetch(currentUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DocScraper/1.0)',
              'Accept': 'text/html,application/xhtml+xml'
            }
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${currentUrl}: ${response.status}`);
            continue;
          }
          
          const html = await response.text();
          pagesScraped++;
          
          // Extract APIs from this page
          const pageApis = extractAPIsFromHTML(html, currentUrl);
          apis.push(...pageApis);
          
          // Extract links for further scraping
          if (pagesScraped < maxPages) {
            const links = extractLinks(html, currentUrl);
            for (const link of links) {
              if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                urlsToVisit.push(link);
              }
            }
          }
          
          logToolExecution('scrape-documentation', { 
            action: 'scraped_page', 
            url: currentUrl, 
            apisFound: pageApis.length 
          });
          
        } catch (error) {
          console.warn(`Error scraping ${currentUrl}:`, error);
          continue;
        }
      }
      
      // Deduplicate APIs
      const uniqueApis = [];
      const seen = new Set();
      
      for (const api of apis) {
        const key = `${api.name}:${api.signature}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueApis.push(api);
        }
      }
      
      const result = {
        apis: uniqueApis,
        pagesScraped,
        success: uniqueApis.length > 0,
        error: uniqueApis.length === 0 ? 'No APIs found' : undefined
      };
      
      logToolExecution('scrape-documentation', { url }, { 
        totalApis: uniqueApis.length,
        pagesScraped 
      });
      
      return result;
    } catch (error) {
      logError('scrape-documentation', error, { url });
      return {
        apis: [],
        pagesScraped: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});