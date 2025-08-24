import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

// Common documentation patterns across languages
const DOC_PATTERNS = {
  websites: [
    /https?:\/\/[\w.-]+\.(?:io|dev|com|org|net)\/(?:docs?|api|reference)/i,
    /documentation.*(?:url|site|link)/i,
    /(?:docs?|api).*https?:\/\//i,
  ],
  files: {
    generic: ['README*', 'readme*', 'DOCUMENTATION*', 'docs/', 'documentation/', 'doc/', 'api/', 'reference/'],
    javascript: ['*.md', '*.d.ts', 'jsdoc.json', 'typedoc.json', 'api.md'],
    typescript: ['*.d.ts', '*.ts', 'tsconfig.json', 'typedoc.json'],
    python: ['*.rst', '*.md', 'docs/conf.py', 'mkdocs.yml', 'sphinx.conf'],
    java: ['javadoc/', '*.java', 'pom.xml', 'build.gradle'],
    rust: ['*.rs', 'Cargo.toml', 'target/doc/', 'rustdoc/'],
    go: ['*.go', 'go.mod', 'godoc/', 'doc.go'],
    ruby: ['*.rb', '*.gemspec', 'yard/', '.yardopts'],
    cpp: ['*.h', '*.hpp', 'Doxyfile', 'doxygen/', 'man/'],
    csharp: ['*.cs', '*.csproj', 'obj/doc/', '*.xml'],
    php: ['*.php', 'composer.json', 'phpdoc.xml'],
    swift: ['*.swift', 'Package.swift', '.jazzy.yaml'],
    kotlin: ['*.kt', 'build.gradle.kts', 'dokka/'],
  }
};

// Package manager detection patterns
const PACKAGE_MANAGERS = {
  'package.json': { name: 'npm', registry: 'https://registry.npmjs.org/', language: 'javascript' },
  'Cargo.toml': { name: 'cargo', registry: 'https://crates.io/', language: 'rust' },
  'pom.xml': { name: 'maven', registry: 'https://search.maven.org/', language: 'java' },
  'build.gradle': { name: 'gradle', registry: 'https://search.maven.org/', language: 'java' },
  'requirements.txt': { name: 'pip', registry: 'https://pypi.org/', language: 'python' },
  'setup.py': { name: 'pip', registry: 'https://pypi.org/', language: 'python' },
  'pyproject.toml': { name: 'pip', registry: 'https://pypi.org/', language: 'python' },
  'go.mod': { name: 'go', registry: 'https://pkg.go.dev/', language: 'go' },
  'Gemfile': { name: 'bundler', registry: 'https://rubygems.org/', language: 'ruby' },
  '*.gemspec': { name: 'gem', registry: 'https://rubygems.org/', language: 'ruby' },
  'composer.json': { name: 'composer', registry: 'https://packagist.org/', language: 'php' },
  'Package.swift': { name: 'spm', registry: 'https://swiftpackageindex.com/', language: 'swift' },
  '*.csproj': { name: 'nuget', registry: 'https://www.nuget.org/', language: 'csharp' },
};

// Documentation site patterns for various languages
const DOC_SITES = {
  javascript: ['npmjs.com', 'unpkg.com', 'jsdelivr.com', 'nodejs.org'],
  python: ['readthedocs.io', 'pypi.org', 'python.org', 'sphinx-doc.org'],
  java: ['javadoc.io', 'maven.org', 'docs.oracle.com'],
  rust: ['docs.rs', 'crates.io', 'rust-lang.org'],
  go: ['pkg.go.dev', 'godoc.org', 'golang.org'],
  ruby: ['rubydoc.info', 'rubygems.org', 'ruby-doc.org'],
  cpp: ['cppreference.com', 'cplusplus.com', 'doxygen.org'],
  csharp: ['docs.microsoft.com', 'nuget.org'],
  php: ['php.net', 'packagist.org', 'phpdoc.org'],
  swift: ['developer.apple.com', 'swiftpackageindex.com'],
  kotlin: ['kotlinlang.org', 'dokka.dev'],
};

export const analyzeRepository = new Tool({
  id: 'analyze-repository',
  description: 'Analyze a repository to detect language, documentation sources, and project structure',
  inputSchema: z.object({
    repoUrl: z.string().describe('The GitHub repository URL'),
  }),
  outputSchema: z.object({
    primaryLanguage: z.string().describe('Primary programming language'),
    languages: z.array(z.object({
      name: z.string(),
      percentage: z.number(),
    })).describe('All languages detected with percentages'),
    documentationSources: z.array(z.object({
      type: z.enum(['website', 'wiki', 'readme', 'source', 'registry', 'generated']),
      url: z.string().optional(),
      path: z.string().optional(),
      priority: z.number(),
    })).describe('Available documentation sources'),
    packageManager: z.object({
      name: z.string(),
      registry: z.string(),
      packageName: z.string().optional(),
    }).optional().describe('Package manager information'),
    projectStructure: z.object({
      type: z.enum(['monorepo', 'standard', 'multi-package']),
      mainPath: z.string().optional(),
      packages: z.array(z.string()).optional(),
      hasDocs: z.boolean(),
      hasTests: z.boolean(),
      hasExamples: z.boolean(),
    }).describe('Repository structure information'),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (ctx) => {
    const { repoUrl } = ctx.context;
    
    logToolExecution('analyze-repository', { repoUrl });
    
    try {
      // Parse GitHub URL
      const parts = repoUrl.replace('https://github.com/', '').split('/');
      const owner = parts[0];
      const repo = parts[1];
      
      // Fetch repository metadata from GitHub API
      const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const repoResponse = await fetch(repoApiUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      if (!repoResponse.ok) {
        throw new Error(`Failed to fetch repository metadata: ${repoResponse.status}`);
      }
      
      const repoData = await repoResponse.json();
      
      // Get language statistics
      const languagesUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
      const languagesResponse = await fetch(languagesUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      const languagesData = await languagesResponse.json();
      const totalBytes = Object.values(languagesData).reduce((sum: number, bytes: any) => sum + bytes, 0) as number;
      
      const languages = Object.entries(languagesData).map(([name, bytes]: [string, any]) => ({
        name,
        percentage: Math.round((bytes / totalBytes) * 100)
      })).sort((a, b) => b.percentage - a.percentage);
      
      const primaryLanguage = languages[0]?.name.toLowerCase() || 'unknown';
      
      // Find documentation sources
      const documentationSources = [];
      
      // 1. Check for documentation website in repository data
      if (repoData.homepage && repoData.homepage.includes('http')) {
        documentationSources.push({
          type: 'website' as const,
          url: repoData.homepage,
          priority: 1
        });
      }
      
      // 2. Check for GitHub wiki
      if (repoData.has_wiki) {
        documentationSources.push({
          type: 'wiki' as const,
          url: `${repoUrl}/wiki`,
          priority: 3
        });
      }
      
      // 3. Fetch README to find documentation links
      const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
      try {
        const readmeResponse = await fetch(readmeUrl, {
          headers: { 'Accept': 'application/vnd.github.v3.raw' }
        });
        
        if (readmeResponse.ok) {
          const readmeContent = await readmeResponse.text();
          
          documentationSources.push({
            type: 'readme' as const,
            path: 'README.md',
            priority: 2
          });
          
          // Extract documentation URLs from README
          for (const pattern of DOC_PATTERNS.websites) {
            const matches = readmeContent.match(pattern);
            if (matches) {
              const urlMatch = matches[0].match(/https?:\/\/[^\s)>\]]+/);
              if (urlMatch) {
                documentationSources.push({
                  type: 'website' as const,
                  url: urlMatch[0],
                  priority: 1
                });
              }
            }
          }
          
          // Check for language-specific documentation sites
          const langDocSites = DOC_SITES[primaryLanguage as keyof typeof DOC_SITES] || [];
          for (const site of langDocSites) {
            if (readmeContent.includes(site)) {
              const urlPattern = new RegExp(`https?://[\\w.-]*${site}[/\\w.-]*`, 'gi');
              const matches = readmeContent.match(urlPattern);
              if (matches) {
                documentationSources.push({
                  type: 'website' as const,
                  url: matches[0],
                  priority: 1
                });
              }
            }
          }
        }
      } catch (error) {
        logError('analyze-repository', error, { action: 'fetch_readme' });
      }
      
      // 4. Check for package manager and registry
      let packageManager = undefined;
      let packageName = repoData.name;
      
      // Get repository contents to check for package files
      const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      try {
        const contentsResponse = await fetch(contentsUrl, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (contentsResponse.ok) {
          const contents = await contentsResponse.json();
          const fileNames = contents.map((item: any) => item.name);
          
          // Check for package manager files
          for (const [file, info] of Object.entries(PACKAGE_MANAGERS)) {
            if (fileNames.some((name: string) => 
              file.includes('*') ? name.endsWith(file.replace('*', '')) : name === file
            )) {
              packageManager = {
                name: info.name,
                registry: info.registry,
                packageName
              };
              
              // Add registry as documentation source
              documentationSources.push({
                type: 'registry' as const,
                url: `${info.registry}${packageName}`,
                priority: 2
              });
              
              break;
            }
          }
          
          // Check for documentation directories
          const hasDocs = fileNames.some((name: string) => 
            ['docs', 'documentation', 'doc', 'api'].includes(name.toLowerCase())
          );
          
          if (hasDocs) {
            documentationSources.push({
              type: 'source' as const,
              path: 'docs/',
              priority: 4
            });
          }
          
          // Check for generated documentation
          const hasGeneratedDocs = fileNames.some((name: string) => 
            ['javadoc', 'rustdoc', 'godoc', 'yard', 'doxygen', 'sphinx'].some(doc => 
              name.toLowerCase().includes(doc)
            )
          );
          
          if (hasGeneratedDocs) {
            documentationSources.push({
              type: 'generated' as const,
              path: 'generated-docs/',
              priority: 3
            });
          }
        }
      } catch (error) {
        logError('analyze-repository', error, { action: 'fetch_contents' });
      }
      
      // 5. Determine project structure
      const projectStructure = await determineProjectStructure(owner, repo);
      
      // Sort documentation sources by priority
      documentationSources.sort((a, b) => a.priority - b.priority);
      
      const result = {
        primaryLanguage,
        languages,
        documentationSources,
        packageManager,
        projectStructure,
        success: true
      };
      
      logToolExecution('analyze-repository', { repoUrl }, result);
      
      return result;
    } catch (error) {
      logError('analyze-repository', error, { repoUrl });
      return {
        primaryLanguage: 'unknown',
        languages: [],
        documentationSources: [],
        packageManager: undefined,
        projectStructure: {
          type: 'standard' as const,
          hasDocs: false,
          hasTests: false,
          hasExamples: false
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Helper function to determine project structure
async function determineProjectStructure(owner: string, repo: string) {
  try {
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const response = await fetch(contentsUrl, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!response.ok) {
      return {
        type: 'standard' as const,
        hasDocs: false,
        hasTests: false,
        hasExamples: false
      };
    }
    
    const contents = await response.json();
    const fileNames = contents.map((item: any) => item.name.toLowerCase());
    const dirNames = contents.filter((item: any) => item.type === 'dir').map((item: any) => item.name.toLowerCase());
    
    // Check for monorepo indicators
    const isMonorepo = fileNames.includes('lerna.json') || 
                      fileNames.includes('rush.json') || 
                      fileNames.includes('pnpm-workspace.yaml') ||
                      fileNames.includes('nx.json') ||
                      dirNames.includes('packages');
    
    // Check for multi-package structure
    const isMultiPackage = dirNames.filter((name: string) => 
      ['packages', 'libs', 'modules', 'components'].includes(name)
    ).length > 0;
    
    // Check for documentation
    const hasDocs = dirNames.some((name: string) => 
      ['docs', 'documentation', 'doc', 'api'].includes(name)
    );
    
    // Check for tests
    const hasTests = dirNames.some((name: string) => 
      ['test', 'tests', 'spec', 'specs', '__tests__'].includes(name)
    );
    
    // Check for examples
    const hasExamples = dirNames.some((name: string) => 
      ['examples', 'example', 'demo', 'demos', 'samples'].includes(name)
    );
    
    // Find main path
    let mainPath = undefined;
    if (dirNames.includes('src')) {
      mainPath = 'src/';
    } else if (dirNames.includes('lib')) {
      mainPath = 'lib/';
    } else if (dirNames.includes('app')) {
      mainPath = 'app/';
    }
    
    // Get packages if monorepo
    let packages = undefined;
    if (isMonorepo && dirNames.includes('packages')) {
      try {
        const packagesUrl = `https://api.github.com/repos/${owner}/${repo}/contents/packages`;
        const packagesResponse = await fetch(packagesUrl, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (packagesResponse.ok) {
          const packagesData = await packagesResponse.json();
          packages = packagesData
            .filter((item: any) => item.type === 'dir')
            .map((item: any) => item.name);
        }
      } catch (error) {
        // Ignore error, packages will be undefined
      }
    }
    
    return {
      type: isMonorepo ? 'monorepo' as const : isMultiPackage ? 'multi-package' as const : 'standard' as const,
      mainPath,
      packages,
      hasDocs,
      hasTests,
      hasExamples
    };
  } catch (error) {
    logError('determine-project-structure', error);
    return {
      type: 'standard' as const,
      hasDocs: false,
      hasTests: false,
      hasExamples: false
    };
  }
}