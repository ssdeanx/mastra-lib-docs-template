import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

// Helper to estimate token count (rough estimate: 4 chars = 1 token)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Files to skip for API documentation
const SKIP_FILES = [
  'CHANGELOG.md',
  'CONTRIBUTING.md', 
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'LICENSE',
  'LICENSE.md',
  'PATENTS',
  '.github',
  'HISTORY.md',
  'CHANGES.md',
  'NEWS.md'
];

// Check if file should be skipped
const shouldSkipFile = (path: string): boolean => {
  const upperPath = path.toUpperCase();
  return SKIP_FILES.some(skip => upperPath.includes(skip.toUpperCase()));
};

export const fetchAllDocs = new Tool({
  id: 'fetch-all-docs',
  description: 'Fetch all documentation files from a GitHub repository including README, API docs, TypeScript definitions, and source files',
  inputSchema: z.object({
    repoUrl: z.string().describe('The GitHub repository URL'),
    searchType: z.enum(['docs', 'types', 'source', 'all']).optional().describe('Type of files to search for'),
    maxFiles: z.number().optional().describe('Maximum number of files to fetch'),
  }),
  outputSchema: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      type: z.string(),
    })).describe('Array of fetched files with their content'),
    success: z.boolean().describe('Whether the fetch was successful'),
    error: z.string().optional().describe('Error message if fetch failed'),
    totalFound: z.number().optional().describe('Total number of relevant files found'),
  }),
  execute: async (ctx) => {
    const { repoUrl, searchType = 'all', maxFiles = 50 } = ctx.context;
    
    logToolExecution('fetch-all-docs', { repoUrl, searchType, maxFiles });
    
    try {
      const files = [];
      
      // Convert GitHub URL to API URL
      const parts = repoUrl.replace('https://github.com/', '').split('/');
      const owner = parts[0];
      const repo = parts[1];
      
      // Paths to check based on search type
      let docPaths = [];
      
      if (searchType === 'docs' || searchType === 'all') {
        docPaths.push(
          'README.md',
          'readme.md',
          'README.rst',
          'API.md',
          'api.md',
          'REFERENCE.md',
          'reference.md',
          'docs/API.md',
          'docs/api.md',
          'docs/reference.md',
          'docs/getting-started.md',
          'docs/quick-start.md',
          'documentation.md',
          'DOCUMENTATION.md',
          'USAGE.md',
          'GUIDE.md'
          // Explicitly excluding CHANGELOG.md and similar files
        );
      }
      
      if (searchType === 'types' || searchType === 'all') {
        docPaths.push(
          'index.d.ts',
          'types/index.d.ts',
          'dist/index.d.ts',
          'lib/index.d.ts',
          'typings/index.d.ts',
          'lodash.d.ts',  // For lodash specifically
          'types.d.ts'
        );
      }
      
      if (searchType === 'source' || searchType === 'all') {
        docPaths.push(
          'package.json',
          'index.js',
          'index.ts',
          'src/index.js',
          'src/index.ts',
          'lib/index.js',
          'dist/index.js',
          'lodash.js',  // For lodash specifically
          'main.js',
          'main.ts'
        );
      }
      
      // Try to fetch from GitHub API for repository contents
      const baseUrl = repoUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\/$/, '');
      
      // Try main branch first, then master
      const branches = ['main', 'master'];
      let branch = 'main';
      
      for (const currentBranch of branches) {
        const testUrl = `${baseUrl}/${currentBranch}/README.md`;
        const response = await fetch(testUrl);
        if (response.ok) {
          branch = currentBranch;
          break;
        }
      }
      
      // Fetch each documentation file
      for (const path of docPaths) {
        // Skip if we've reached max files
        if (files.length >= maxFiles) break;
        
        // Skip unwanted files
        if (shouldSkipFile(path)) {
          console.log(`Skipping non-API file: ${path}`);
          continue;
        }
        
        try {
          const rawUrl = `${baseUrl}/${branch}/${path}`;
          const response = await fetch(rawUrl);
          
          if (response.ok) {
            const content = await response.text();
            const fileType = path.split('.').pop() || 'unknown';
            const tokens = estimateTokens(content);
            
            // Warn about large files
            if (tokens > 50000) {
              console.warn(`WARNING: ${path} is very large (${tokens} tokens, ${content.length} chars). Will need chunking.`);
              
              // Don't truncate package.json as we need to parse it later
              if (path === 'package.json') {
                files.push({
                  path,
                  content,
                  type: fileType,
                  estimatedTokens: tokens,
                  largeFile: true
                });
              } else {
                // For other files, truncate to first 200KB
                const truncatedContent = content.substring(0, 200000);
                files.push({
                  path,
                  content: truncatedContent,
                  type: fileType,
                  truncated: true,
                  originalSize: content.length,
                  estimatedTokens: tokens
                });
              }
            } else {
              files.push({
                path,
                content,
                type: fileType,
                estimatedTokens: tokens
              });
            }
            
            logToolExecution('fetch-all-docs', { 
              action: 'fetched_file', 
              path, 
              contentLength: content.length,
              tokens
            });
          }
        } catch (error) {
          // Continue with other files if one fails
          logError('fetch-all-docs', error, { path });
        }
      }
      
      // Try to fetch from GitHub API to discover more files
      if (files.length < maxFiles && (searchType === 'all' || searchType === 'docs')) {
        try {
          // First, try to discover the repository structure
          const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
          const repoResponse = await fetch(repoApiUrl, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (repoResponse.ok) {
            const repoData = await repoResponse.json();
            console.log(`Repository: ${repoData.full_name}, Language: ${repoData.language}`);
          }
          
          // Try common documentation directories
          const docDirs = ['docs', 'documentation', 'doc', 'api-docs'];
          
          for (const dir of docDirs) {
            if (files.length >= maxFiles) break;
            
            const docsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}`;
            const docsResponse = await fetch(docsUrl, {
              headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            
            if (docsResponse.ok) {
              const docsContents = await docsResponse.json();
              for (const file of docsContents) {
                if (files.length >= maxFiles) break;
                
                if (file.type === 'file' && (file.name.endsWith('.md') || file.name.endsWith('.rst'))) {
                  const filePath = `${dir}/${file.name}`;
                  
                  // Skip unwanted files
                  if (shouldSkipFile(filePath)) {
                    console.log(`Skipping non-API file: ${filePath}`);
                    continue;
                  }
                  
                  try {
                    const fileResponse = await fetch(file.download_url);
                    if (fileResponse.ok) {
                      const content = await fileResponse.text();
                      const tokens = estimateTokens(content);
                      
                      // Handle large files
                      if (tokens > 50000) {
                        console.warn(`WARNING: ${filePath} is very large (${tokens} tokens). Truncating.`);
                        const truncatedContent = content.substring(0, 200000);
                        files.push({
                          path: filePath,
                          content: truncatedContent,
                          type: file.name.split('.').pop() || 'unknown',
                          truncated: true,
                          originalSize: content.length,
                          estimatedTokens: tokens
                        });
                      } else {
                        files.push({
                          path: filePath,
                          content,
                          type: file.name.split('.').pop() || 'unknown',
                          estimatedTokens: tokens
                        });
                      }
                    }
                  } catch (error) {
                    logError('fetch-all-docs', error, { file: file.name });
                  }
                }
              }
            }
          }
        } catch (error) {
          logError('fetch-all-docs', error, { action: 'fetch_docs_directory' });
        }
      }
      
      // Try to fetch TypeScript definitions from multiple locations
      if (files.length < maxFiles && (searchType === 'types' || searchType === 'all')) {
        try {
          // Check multiple common locations for type definitions
          const typeLocations = ['', 'types', 'typings', 'dist', 'lib', '@types'];
          
          for (const location of typeLocations) {
            if (files.length >= maxFiles) break;
            
            const url = location 
              ? `https://api.github.com/repos/${owner}/${repo}/contents/${location}`
              : `https://api.github.com/repos/${owner}/${repo}/contents`;
              
            const response = await fetch(url, {
              headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            
            if (response.ok) {
              const contents = await response.json();
              
              // For directories, look for .d.ts files
              if (Array.isArray(contents)) {
                for (const file of contents) {
                  if (files.length >= maxFiles) break;
                  
                  if (file.type === 'file' && file.name.endsWith('.d.ts')) {
                    try {
                      const fileResponse = await fetch(file.download_url);
                      if (fileResponse.ok) {
                        const content = await fileResponse.text();
                        const filePath = location ? `${location}/${file.name}` : file.name;
                        files.push({
                          path: filePath,
                          content,
                          type: 'd.ts',
                        });
                        
                        logToolExecution('fetch-all-docs', { 
                          action: 'fetched_type_definition', 
                          path: filePath,
                          contentLength: content.length 
                        });
                      }
                    } catch (error) {
                      logError('fetch-all-docs', error, { file: file.name });
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          logError('fetch-all-docs', error, { action: 'fetch_type_definitions' });
        }
      }
      
      // Check if it's a monorepo and handle packages directory
      if (files.length < maxFiles && (searchType === 'types' || searchType === 'all')) {
        try {
          const packagesUrl = `https://api.github.com/repos/${owner}/${repo}/contents/packages`;
          const packagesResponse = await fetch(packagesUrl, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (packagesResponse.ok) {
            const packages = await packagesResponse.json();
            console.log(`Found monorepo with ${packages.length} packages`);
            
            // For monorepos, look for main packages
            for (const pkg of packages) {
              if (files.length >= maxFiles) break;
              
              if (pkg.type === 'dir') {
                // Try to fetch package.json and type definitions from each package
                const pkgJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/packages/${pkg.name}/package.json`;
                const pkgJsonResponse = await fetch(pkgJsonUrl, {
                  headers: { 'Accept': 'application/vnd.github.v3+json' }
                });
                
                if (pkgJsonResponse.ok) {
                  const pkgJsonData = await pkgJsonResponse.json();
                  const pkgJsonContent = Buffer.from(pkgJsonData.content, 'base64').toString();
                  
                  files.push({
                    path: `packages/${pkg.name}/package.json`,
                    content: pkgJsonContent,
                    type: 'json',
                  });
                  
                  // Try to find type definitions in this package
                  const pkgTypesUrl = `https://api.github.com/repos/${owner}/${repo}/contents/packages/${pkg.name}`;
                  const pkgTypesResponse = await fetch(pkgTypesUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                  });
                  
                  if (pkgTypesResponse.ok && files.length < maxFiles) {
                    const pkgContents = await pkgTypesResponse.json();
                    for (const file of pkgContents) {
                      if (files.length >= maxFiles) break;
                      
                      if (file.type === 'file' && (file.name === 'index.d.ts' || file.name === 'index.ts' || file.name === 'index.js')) {
                        try {
                          const fileResponse = await fetch(file.download_url);
                          if (fileResponse.ok) {
                            const content = await fileResponse.text();
                            files.push({
                              path: `packages/${pkg.name}/${file.name}`,
                              content,
                              type: file.name.split('.').pop() || 'unknown',
                            });
                          }
                        } catch (error) {
                          logError('fetch-all-docs', error, { file: file.name });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          // Not a monorepo, continue with regular processing
          console.log('Not a monorepo structure');
        }
      }
      
      // Try to fetch main source file if specified in package.json
      if (searchType === 'source' || searchType === 'all') {
        const packageJsonFile = files.find(f => f.path === 'package.json');
        if (packageJsonFile) {
          // Skip parsing if the file was truncated to avoid JSON parse errors
          if (packageJsonFile.truncated) {
            console.log('Skipping package.json parsing - file was truncated');
          } else {
            try {
              const pkg = JSON.parse(packageJsonFile.content);
              const mainFile = pkg.main || pkg.module || pkg.browser;
              const typesFile = pkg.types || pkg.typings;
            
            if (mainFile && files.length < maxFiles) {
              const mainUrl = `${baseUrl}/${branch}/${mainFile}`;
              try {
                const response = await fetch(mainUrl);
                if (response.ok) {
                  const content = await response.text();
                  files.push({
                    path: mainFile,
                    content,
                    type: mainFile.split('.').pop() || 'js',
                  });
                  
                  logToolExecution('fetch-all-docs', { 
                    action: 'fetched_main_file', 
                    path: mainFile,
                    contentLength: content.length 
                  });
                }
              } catch (error) {
                logError('fetch-all-docs', error, { file: mainFile });
              }
            }
            
            if (typesFile && files.length < maxFiles) {
              const typesUrl = `${baseUrl}/${branch}/${typesFile}`;
              try {
                const response = await fetch(typesUrl);
                if (response.ok) {
                  const content = await response.text();
                  files.push({
                    path: typesFile,
                    content,
                    type: 'd.ts',
                  });
                  
                  logToolExecution('fetch-all-docs', { 
                    action: 'fetched_types_file', 
                    path: typesFile,
                    contentLength: content.length 
                  });
                }
              } catch (error) {
                logError('fetch-all-docs', error, { file: typesFile });
              }
            }
            } catch (error) {
              logError('fetch-all-docs', error, { action: 'parse_package_json' });
            }
          }
        }
      }
      
      const result = {
        files,
        success: files.length > 0,
        error: files.length === 0 ? 'No documentation files found' : undefined,
        totalFound: files.length,
      };
      
      logToolExecution('fetch-all-docs', { repoUrl }, { 
        success: result.success, 
        filesCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
        searchType
      });
      
      return result;
    } catch (error) {
      logError('fetch-all-docs', error, { repoUrl });
      return {
        files: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});