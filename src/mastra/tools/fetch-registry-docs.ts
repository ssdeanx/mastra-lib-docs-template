import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

// Package registry configurations
const REGISTRIES = {
  npm: {
    api: 'https://registry.npmjs.org/',
    packageUrl: (name: string) => `https://registry.npmjs.org/${name}`,
    typesPackage: (name: string) => `@types/${name.replace('@', '').replace('/', '__')}`,
    docsFields: ['readme'],
    metadataFields: ['homepage', 'repository', 'bugs'],
    webUrl: (name: string) => `https://www.npmjs.com/package/${name}`,
    docsUrl: undefined
  },
  pypi: {
    api: 'https://pypi.org/',
    packageUrl: (name: string) => `https://pypi.org/pypi/${name}/json`,
    docsFields: ['info.description', 'info.description_content_type'],
    metadataFields: ['info.home_page', 'info.docs_url', 'info.project_urls'],
    webUrl: (name: string) => `https://pypi.org/project/${name}/`,
    typesPackage: undefined,
    docsUrl: undefined
  },
  maven: {
    api: 'https://search.maven.org/',
    packageUrl: (group: string, artifact: string) => 
      `https://search.maven.org/solrsearch/select?q=g:"${group}"+AND+a:"${artifact}"&wt=json`,
    docsUrl: (group: string, artifact: string) => 
      `https://javadoc.io/doc/${group}/${artifact}`,
    webUrl: (group: string, artifact: string) => 
      `https://search.maven.org/artifact/${group}/${artifact}`
  },
  cargo: {
    api: 'https://crates.io/',
    packageUrl: (name: string) => `https://crates.io/api/v1/crates/${name}`,
    docsUrl: (name: string) => `https://docs.rs/${name}`,
    metadataFields: ['crate.homepage', 'crate.repository', 'crate.documentation'],
    webUrl: (name: string) => `https://crates.io/crates/${name}`
  },
  rubygems: {
    api: 'https://rubygems.org/',
    packageUrl: (name: string) => `https://rubygems.org/api/v1/gems/${name}.json`,
    docsUrl: (name: string) => `https://rubydoc.info/gems/${name}`,
    metadataFields: ['homepage_uri', 'documentation_uri', 'source_code_uri'],
    webUrl: (name: string) => `https://rubygems.org/gems/${name}`
  },
  go: {
    api: 'https://pkg.go.dev/',
    packageUrl: (name: string) => `https://pkg.go.dev/${name}`,
    proxyUrl: (name: string) => `https://proxy.golang.org/${name}/@latest`,
    webUrl: (name: string) => `https://pkg.go.dev/${name}`,
    typesPackage: undefined,
    docsUrl: undefined
  },
  nuget: {
    api: 'https://api.nuget.org/',
    packageUrl: (name: string) => 
      `https://api.nuget.org/v3-flatcontainer/${name.toLowerCase()}/index.json`,
    catalogUrl: (name: string, version: string) => 
      `https://api.nuget.org/v3/catalog0/data/2018.12.13.06.51.26/${name.toLowerCase()}.${version}.json`,
    webUrl: (name: string) => `https://www.nuget.org/packages/${name}`
  },
  composer: {
    api: 'https://packagist.org/',
    packageUrl: (name: string) => `https://packagist.org/packages/${name}.json`,
    metadataFields: ['package.homepage', 'package.docs', 'package.wiki'],
    webUrl: (name: string) => `https://packagist.org/packages/${name}`
  },
  cocoapods: {
    api: 'https://cocoapods.org/',
    packageUrl: (name: string) => `https://cocoapods.org/pods/${name}`,
    specUrl: (name: string) => 
      `https://raw.githubusercontent.com/CocoaPods/Specs/master/Specs/${name}.podspec.json`,
    webUrl: (name: string) => `https://cocoapods.org/pods/${name}`
  }
};

export const fetchRegistryDocs = new Tool({
  id: 'fetch-registry-docs',
  description: 'Fetch package documentation from a package registry',
  inputSchema: z.object({
    packageName: z.string().describe('The package name'),
    registry: z.enum(['npm', 'pypi', 'maven', 'cargo', 'rubygems', 'go', 'nuget', 'composer', 'cocoapods'])
      .describe('The package registry'),
    includeTypes: z.boolean().optional().describe('Whether to fetch TypeScript types for npm packages'),
  }),
  outputSchema: z.object({
    packageInfo: z.object({
      name: z.string(),
      version: z.string().optional(),
      description: z.string().optional(),
      homepage: z.string().optional(),
      repository: z.string().optional(),
      documentation: z.string().optional(),
    }).describe('Package metadata'),
    readme: z.string().optional().describe('Package README content'),
    apis: z.array(z.object({
      signature: z.string(),
      description: z.string(),
      category: z.string().optional(),
    })).optional().describe('APIs extracted from package docs'),
    types: z.string().optional().describe('TypeScript type definitions'),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (ctx) => {
    const { packageName, registry, includeTypes = true } = ctx.context;
    
    logToolExecution('fetch-registry-docs', { packageName, registry });
    
    try {
      const registryConfig = REGISTRIES[registry];
      let packageInfo: any = {
        name: packageName
      };
      let readme: string | undefined;
      let types: string | undefined;
      let apis: any[] = [];
      
      switch (registry) {
        case 'npm': {
          // Fetch from npm registry
          const response = await fetch((registryConfig as any).packageUrl(packageName));
          
          if (!response.ok) {
            throw new Error(`Package not found: ${packageName}`);
          }
          
          const data = await response.json();
          const latestVersion = data['dist-tags']?.latest || Object.keys(data.versions).pop();
          const versionData = data.versions[latestVersion];
          
          packageInfo = {
            name: data.name,
            version: latestVersion,
            description: versionData.description,
            homepage: versionData.homepage,
            repository: typeof versionData.repository === 'object' 
              ? versionData.repository.url 
              : versionData.repository,
            documentation: versionData.homepage || versionData.repository?.url
          };
          
          readme = versionData.readme || data.readme;
          
          // Try to fetch TypeScript types
          if (includeTypes) {
            try {
              const typesPackageName = (registryConfig as any).typesPackage?.(packageName);
              if (!typesPackageName) break;
              const typesResponse = await fetch((registryConfig as any).packageUrl(typesPackageName));
              
              if (typesResponse.ok) {
                const typesData = await typesResponse.json();
                const latestTypesVersion = typesData['dist-tags']?.latest;
                
                if (latestTypesVersion) {
                  // Fetch the actual .d.ts file from unpkg
                  const unpkgUrl = `https://unpkg.com/${typesPackageName}@${latestTypesVersion}/index.d.ts`;
                  const dtsResponse = await fetch(unpkgUrl);
                  
                  if (dtsResponse.ok) {
                    types = await dtsResponse.text();
                  }
                }
              }
            } catch (error) {
              // Types not available, continue without them
              logError('fetch-registry-docs', error, { action: 'fetch_types', package: packageName });
            }
          }
          
          break;
        }
        
        case 'pypi': {
          const response = await fetch((registryConfig as any).packageUrl(packageName));
          
          if (!response.ok) {
            throw new Error(`Package not found: ${packageName}`);
          }
          
          const data = await response.json();
          
          packageInfo = {
            name: data.info.name,
            version: data.info.version,
            description: data.info.summary,
            homepage: data.info.home_page,
            repository: data.info.project_urls?.Source || data.info.project_urls?.Repository,
            documentation: data.info.docs_url || data.info.project_urls?.Documentation
          };
          
          readme = data.info.description;
          
          // Extract function signatures from description if it's restructured text
          if (data.info.description_content_type === 'text/x-rst') {
            const functionPattern = /^\.\. function::\s+(.+)$/gm;
            const classPattern = /^\.\. class::\s+(.+)$/gm;
            const methodPattern = /^\.\. method::\s+(.+)$/gm;
            
            let match;
            while ((match = functionPattern.exec(readme || '')) !== null) {
              apis.push({
                signature: match[1],
                description: 'Python function',
                category: 'function'
              });
            }
            while ((match = classPattern.exec(readme || '')) !== null) {
              apis.push({
                signature: match[1],
                description: 'Python class',
                category: 'class'
              });
            }
            while ((match = methodPattern.exec(readme || '')) !== null) {
              apis.push({
                signature: match[1],
                description: 'Python method',
                category: 'method'
              });
            }
          }
          
          break;
        }
        
        case 'cargo': {
          const response = await fetch((registryConfig as any).packageUrl(packageName));
          
          if (!response.ok) {
            throw new Error(`Package not found: ${packageName}`);
          }
          
          const data = await response.json();
          const crate = data.crate;
          
          packageInfo = {
            name: crate.name,
            version: crate.max_version,
            description: crate.description,
            homepage: crate.homepage,
            repository: crate.repository,
            documentation: crate.documentation || (registryConfig as any).docsUrl?.(packageName)
          };
          
          readme = crate.readme;
          
          // Try to fetch API docs from docs.rs
          try {
            const docsUrl = `${(registryConfig as any).docsUrl?.(packageName)}/latest/${packageName}/`;
            const docsResponse = await fetch(docsUrl);
            
            if (docsResponse.ok) {
              const docsHtml = await docsResponse.text();
              
              // Extract Rust API signatures
              const structPattern = /<h3[^>]*>(?:pub )?struct\s+<[^>]*>([^<]+)</gi;
              const fnPattern = /<h3[^>]*>(?:pub )?fn\s+<[^>]*>([^<]+)</gi;
              const traitPattern = /<h3[^>]*>(?:pub )?trait\s+<[^>]*>([^<]+)</gi;
              
              let match;
              while ((match = structPattern.exec(docsHtml)) !== null) {
                apis.push({
                  signature: `struct ${match[1]}`,
                  description: 'Rust struct',
                  category: 'struct'
                });
              }
              while ((match = fnPattern.exec(docsHtml)) !== null) {
                apis.push({
                  signature: `fn ${match[1]}`,
                  description: 'Rust function',
                  category: 'function'
                });
              }
              while ((match = traitPattern.exec(docsHtml)) !== null) {
                apis.push({
                  signature: `trait ${match[1]}`,
                  description: 'Rust trait',
                  category: 'trait'
                });
              }
            }
          } catch (error) {
            logError('fetch-registry-docs', error, { action: 'fetch_docs_rs', package: packageName });
          }
          
          break;
        }
        
        case 'rubygems': {
          const response = await fetch((registryConfig as any).packageUrl(packageName));
          
          if (!response.ok) {
            throw new Error(`Package not found: ${packageName}`);
          }
          
          const data = await response.json();
          
          packageInfo = {
            name: data.name,
            version: data.version,
            description: data.info,
            homepage: data.homepage_uri,
            repository: data.source_code_uri,
            documentation: data.documentation_uri || (registryConfig as any).docsUrl?.(packageName)
          };
          
          // Ruby gems don't typically include README in API response
          // Would need to fetch from repository
          
          break;
        }
        
        case 'go': {
          // Fetch from Go proxy
          try {
            const proxyResponse = await fetch((registryConfig as any).proxyUrl?.(packageName));
            
            if (proxyResponse.ok) {
              const data = await proxyResponse.json();
              
              packageInfo = {
                name: packageName,
                version: data.Version,
                description: `Go package ${packageName}`,
                homepage: (registryConfig as any).packageUrl(packageName),
                repository: `https://github.com/${packageName}`,
                documentation: (registryConfig as any).packageUrl(packageName)
              };
            }
          } catch (error) {
            // Fallback to basic info
            packageInfo = {
              name: packageName,
              description: `Go package ${packageName}`,
              documentation: (registryConfig as any).packageUrl(packageName)
            };
          }
          
          // Try to scrape pkg.go.dev for API docs
          try {
            const docsResponse = await fetch((registryConfig as any).packageUrl(packageName));
            
            if (docsResponse.ok) {
              const html = await docsResponse.text();
              
              // Extract Go API signatures
              const funcPattern = /<h3[^>]*>func\s+<[^>]*>([^<]+)</gi;
              const typePattern = /<h3[^>]*>type\s+<[^>]*>([^<]+)</gi;
              
              let match;
              while ((match = funcPattern.exec(html)) !== null) {
                apis.push({
                  signature: `func ${match[1]}`,
                  description: 'Go function',
                  category: 'function'
                });
              }
              while ((match = typePattern.exec(html)) !== null) {
                apis.push({
                  signature: `type ${match[1]}`,
                  description: 'Go type',
                  category: 'type'
                });
              }
            }
          } catch (error) {
            logError('fetch-registry-docs', error, { action: 'fetch_go_docs', package: packageName });
          }
          
          break;
        }
        
        case 'maven': {
          // Maven packages need group and artifact IDs
          const [group, artifact] = packageName.split(':');
          
          if (!group || !artifact) {
            throw new Error('Maven packages require format: groupId:artifactId');
          }
          
          const response = await fetch((registryConfig as any).packageUrl(group, artifact));
          
          if (!response.ok) {
            throw new Error(`Package not found: ${packageName}`);
          }
          
          const data = await response.json();
          const latest = data.response.docs[0];
          
          if (latest) {
            packageInfo = {
              name: `${latest.g}:${latest.a}`,
              version: latest.latestVersion,
              description: `Maven package ${latest.a}`,
              homepage: (registryConfig as any).webUrl(group, artifact),
              repository: latest.repositoryUrl,
              documentation: (registryConfig as any).docsUrl?.(group, artifact)
            };
          }
          
          break;
        }
        
        default:
          throw new Error(`Registry ${registry} not fully implemented yet`);
      }
      
      // Extract APIs from README if available and no APIs found yet
      if (readme && apis.length === 0) {
        // Look for code blocks with function signatures
        const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockPattern.exec(readme)) !== null) {
          const code = match[1];
          
          // Extract function-like patterns
          const funcPatterns = [
            /(?:function|def|fn|func)\s+(\w+)\s*\([^)]*\)/g,
            /(\w+)\s*:\s*\([^)]*\)\s*=>/g,
            /class\s+(\w+)/g,
            /interface\s+(\w+)/g,
          ];
          
          for (const pattern of funcPatterns) {
            let funcMatch;
            while ((funcMatch = pattern.exec(code)) !== null) {
              apis.push({
                signature: funcMatch[0],
                description: 'Extracted from README',
                category: 'readme'
              });
            }
          }
        }
      }
      
      const result = {
        packageInfo,
        readme: readme?.substring(0, 50000), // Limit README size
        apis: apis.length > 0 ? apis : undefined,
        types,
        success: true
      };
      
      logToolExecution('fetch-registry-docs', { packageName, registry }, { 
        hasReadme: !!readme,
        hasTypes: !!types,
        apiCount: apis.length 
      });
      
      return result;
    } catch (error) {
      logError('fetch-registry-docs', error, { packageName, registry });
      return {
        packageInfo: { name: packageName },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});