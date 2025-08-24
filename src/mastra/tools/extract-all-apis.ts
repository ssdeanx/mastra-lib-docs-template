import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { logToolExecution, logError } from '../config/logger';

export const extractAllApis = new Tool({
  id: 'extract-all-apis',
  description: 'Extract all API methods, functions, and signatures from documentation and source code',
  inputSchema: z.object({
    content: z.string().describe('The content to extract APIs from'),
    contentType: z.string().describe('Type of content (md, d.ts, js, ts, py, java, rust, go, rb, cpp, cs, php, swift, kt)'),
    language: z.string().optional().describe('Programming language for context'),
  }),
  outputSchema: z.object({
    apis: z.array(z.object({
      signature: z.string().describe('Method signature'),
      description: z.string().describe('Brief description'),
      category: z.string().optional().describe('API category'),
    })).describe('Extracted API methods'),
    success: z.boolean().describe('Whether extraction was successful'),
  }),
  execute: async (ctx) => {
    const { content, contentType, language } = ctx.context;
    
    logToolExecution('extract-all-apis', { contentType, contentLength: content.length });
    
    try {
      const apis = [];
      
      if (contentType === 'md' || contentType === 'rst') {
        // Extract APIs from markdown/restructured text documentation
        
        // Look for code blocks with any language
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
          const codeBlock = match[1];
          // Extract anything that looks like a function/method call
          const functionPatterns = [
            /([a-zA-Z_][\w.]*)\s*\([^)]*\)/g,  // function calls
            /([a-zA-Z_][\w]*)::\w+/g,  // C++/Ruby style
            /([a-zA-Z_][\w]*)\.\w+/g,  // dot notation
          ];
          
          for (const pattern of functionPatterns) {
            let funcMatch;
            while ((funcMatch = pattern.exec(codeBlock)) !== null) {
              const sig = funcMatch[0].trim();
              if (sig && !sig.startsWith('//') && !sig.startsWith('#')) {
                apis.push({
                  signature: sig,
                  description: 'Extracted from code block',
                  category: 'code-block',
                });
              }
            }
          }
        }
        
        // Look for inline code with method signatures - more comprehensive
        const inlinePatterns = [
          /`([a-zA-Z_][\w._]*\([^`]*\))`/g,  // function with params
          /`([a-zA-Z_][\w.]*)`\s*[-–—:]\s*([^.\n]{5,50})/g,  // code followed by description
          /\*\*`([a-zA-Z_][\w._]*\([^`]*\))`\*\*/g,  // bold code
          /`_\.([a-zA-Z_][\w]*)\([^`]*\)`/g,  // lodash style
        ];
        
        for (const pattern of inlinePatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const signature = match[1];
            const description = match[2] || 'API method';
            if (signature && !signature.includes(' ') || signature.includes('(')) {
              apis.push({
                signature,
                description: description.trim(),
                category: 'inline',
              });
            }
          }
        }
        
        // Look for API listings in lists
        const listPatterns = [
          /^[\*\-]\s*`([^`]+)`\s*[-–—:]\s*(.+)$/gm,  // bullet with code
          /^\d+\.\s*`([^`]+)`\s*[-–—:]\s*(.+)$/gm,  // numbered with code
          /^[\*\-]\s*\*\*([^*]+)\*\*\s*[-–—:]\s*(.+)$/gm,  // bullet with bold
        ];
        
        for (const pattern of listPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const signature = match[1].trim();
            const description = match[2].trim();
            apis.push({
              signature,
              description: description || 'API method',
              category: 'list',
            });
          }
        }
        
        // Look for API tables in markdown
        const tableRowRegex = /\|\s*`?([^|`]+)`?\s*\|([^|]*)\|/g;
        while ((match = tableRowRegex.exec(content)) !== null) {
          const signature = match[1].trim();
          const description = match[2].trim();
          if (signature && (signature.includes('(') || signature.includes('.') || signature.includes('::'))) {
            apis.push({
              signature,
              description: description || 'API method',
              category: 'table',
            });
          }
        }
        
        // Look for section headers that might be API names
        const headerRegex = /^#{2,4}\s+`?([a-zA-Z_][\w.()]*)`?$/gm;
        while ((match = headerRegex.exec(content)) !== null) {
          const signature = match[1].trim();
          if (signature && (signature.includes('(') || signature.includes('.'))) {
            apis.push({
              signature,
              description: 'API section',
              category: 'header',
            });
          }
        }
      } else if (contentType === 'd.ts' || contentType === 'ts') {
        // Extract from TypeScript definitions
        const exportRegex = /export\s+(?:declare\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const methodRegex = /(?:export\s+)?(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(<[^>]*>)?\s*\(([^)]*)\)\s*:\s*([^;{]+)/g;
        const propertyRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*\(([^)]*)\)\s*=>\s*([^;,}]+)/g;
        
        // Extract function signatures
        let match;
        while ((match = methodRegex.exec(content)) !== null) {
          const name = match[1];
          const generics = match[2] || '';
          const params = match[3];
          const returnType = match[4];
          
          apis.push({
            signature: `${name}${generics}(${params})`,
            description: `Returns ${returnType.trim()}`,
            category: 'function',
          });
        }
        
        // Extract property methods
        while ((match = propertyRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          const returnType = match[3];
          
          apis.push({
            signature: `${name}(${params})`,
            description: `Returns ${returnType.trim()}`,
            category: 'method',
          });
        }
        
        // Extract exports
        while ((match = exportRegex.exec(content)) !== null) {
          const name = match[1];
          if (!apis.some(api => api.signature.includes(name))) {
            apis.push({
              signature: name,
              description: 'Exported entity',
              category: 'export',
            });
          }
        }
      } else if (contentType === 'js') {
        // Extract from JavaScript
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g;
        const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
        const methodRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/g;
        const classMethodRegex = /(?:static\s+)?(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*{/g;
        
        let match;
        
        // Extract regular functions
        while ((match = functionRegex.exec(content)) !== null) {
          apis.push({
            signature: `${match[1]}(${match[2]})`,
            description: 'Function',
            category: 'function',
          });
        }
        
        // Extract arrow functions
        while ((match = arrowRegex.exec(content)) !== null) {
          apis.push({
            signature: `${match[1]}(${match[2]})`,
            description: 'Arrow function',
            category: 'function',
          });
        }
        
        // Extract object methods
        while ((match = methodRegex.exec(content)) !== null) {
          apis.push({
            signature: `${match[1]}(${match[2]})`,
            description: 'Method',
            category: 'method',
          });
        }
        
        // Extract class methods
        while ((match = classMethodRegex.exec(content)) !== null) {
          if (!['constructor', 'if', 'for', 'while', 'switch'].includes(match[1])) {
            apis.push({
              signature: `${match[1]}(${match[2]})`,
              description: 'Class method',
              category: 'method',
            });
          }
        }
      } else if (contentType === 'py' || contentType === 'python') {
        // Extract from Python source
        const classRegex = /^class\s+(\w+)(?:\([^)]*\))?:/gm;
        const functionRegex = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/gm;
        const decoratorRegex = /^@(\w+)(?:\.\w+)*(?:\([^)]*\))?/gm;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'Python class',
            category: 'class',
          });
        }
        
        // Extract functions
        while ((match = functionRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          const returnType = match[3] || '';
          apis.push({
            signature: `def ${name}(${params})${returnType ? ' -> ' + returnType : ''}`,
            description: 'Python function',
            category: 'function',
          });
        }
        
        // Extract decorators
        while ((match = decoratorRegex.exec(content)) !== null) {
          apis.push({
            signature: `@${match[1]}`,
            description: 'Python decorator',
            category: 'decorator',
          });
        }
      } else if (contentType === 'java') {
        // Extract from Java source
        const classRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?class\s+(\w+)/g;
        const interfaceRegex = /(?:public|private|protected)?\s*interface\s+(\w+)/g;
        const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:[\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)/g;
        const annotationRegex = /@(\w+)(?:\([^)]*\))?/g;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'Java class',
            category: 'class',
          });
        }
        
        // Extract interfaces
        while ((match = interfaceRegex.exec(content)) !== null) {
          apis.push({
            signature: `interface ${match[1]}`,
            description: 'Java interface',
            category: 'interface',
          });
        }
        
        // Extract methods
        while ((match = methodRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
            apis.push({
              signature: `${name}(${params})`,
              description: 'Java method',
              category: 'method',
            });
          }
        }
      } else if (contentType === 'rs' || contentType === 'rust') {
        // Extract from Rust source
        const structRegex = /pub\s+struct\s+(\w+)/g;
        const enumRegex = /pub\s+enum\s+(\w+)/g;
        const fnRegex = /pub\s+(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/g;
        const traitRegex = /pub\s+trait\s+(\w+)/g;
        const implRegex = /impl(?:<[^>]+>)?\s+(\w+)/g;
        
        let match;
        
        // Extract structs
        while ((match = structRegex.exec(content)) !== null) {
          apis.push({
            signature: `struct ${match[1]}`,
            description: 'Rust struct',
            category: 'struct',
          });
        }
        
        // Extract enums
        while ((match = enumRegex.exec(content)) !== null) {
          apis.push({
            signature: `enum ${match[1]}`,
            description: 'Rust enum',
            category: 'enum',
          });
        }
        
        // Extract functions
        while ((match = fnRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          const returnType = match[3] || '';
          apis.push({
            signature: `fn ${name}(${params})${returnType ? ' -> ' + returnType.trim() : ''}`,
            description: 'Rust function',
            category: 'function',
          });
        }
        
        // Extract traits
        while ((match = traitRegex.exec(content)) !== null) {
          apis.push({
            signature: `trait ${match[1]}`,
            description: 'Rust trait',
            category: 'trait',
          });
        }
      } else if (contentType === 'go') {
        // Extract from Go source
        const funcRegex = /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*(?:\([^)]*\)|[^{]+))?/g;
        const typeRegex = /type\s+(\w+)\s+(?:struct|interface|\w+)/g;
        const interfaceMethodRegex = /^\s*(\w+)\s*\(([^)]*)\)(?:\s*(?:\([^)]*\)|[^\n]+))?$/gm;
        
        let match;
        
        // Extract functions
        while ((match = funcRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          apis.push({
            signature: `func ${name}(${params})`,
            description: 'Go function',
            category: 'function',
          });
        }
        
        // Extract types
        while ((match = typeRegex.exec(content)) !== null) {
          apis.push({
            signature: `type ${match[1]}`,
            description: 'Go type',
            category: 'type',
          });
        }
      } else if (contentType === 'rb' || contentType === 'ruby') {
        // Extract from Ruby source
        const classRegex = /class\s+(\w+)(?:\s*<\s*\w+)?/g;
        const moduleRegex = /module\s+(\w+)/g;
        const methodRegex = /def\s+(?:self\.)?(\w+)(?:\(([^)]*)\))?/g;
        const attrRegex = /attr_(?:reader|writer|accessor)\s+:?(\w+)/g;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'Ruby class',
            category: 'class',
          });
        }
        
        // Extract modules
        while ((match = moduleRegex.exec(content)) !== null) {
          apis.push({
            signature: `module ${match[1]}`,
            description: 'Ruby module',
            category: 'module',
          });
        }
        
        // Extract methods
        while ((match = methodRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2] || '';
          apis.push({
            signature: `def ${name}${params ? '(' + params + ')' : ''}`,
            description: 'Ruby method',
            category: 'method',
          });
        }
      } else if (contentType === 'cpp' || contentType === 'cc' || contentType === 'h' || contentType === 'hpp') {
        // Extract from C++ source
        const classRegex = /class\s+(\w+)/g;
        const structRegex = /struct\s+(\w+)/g;
        const functionRegex = /(?:[\w:]+\s+)?(\w+)\s*\(([^)]*)\)(?:\s*const)?(?:\s*override)?/g;
        const namespaceRegex = /namespace\s+(\w+)/g;
        const templateRegex = /template\s*<[^>]+>\s*(?:class|struct)\s+(\w+)/g;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'C++ class',
            category: 'class',
          });
        }
        
        // Extract structs
        while ((match = structRegex.exec(content)) !== null) {
          apis.push({
            signature: `struct ${match[1]}`,
            description: 'C++ struct',
            category: 'struct',
          });
        }
        
        // Extract templates
        while ((match = templateRegex.exec(content)) !== null) {
          apis.push({
            signature: `template ${match[1]}`,
            description: 'C++ template',
            category: 'template',
          });
        }
      } else if (contentType === 'cs' || contentType === 'csharp') {
        // Extract from C# source
        const classRegex = /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:partial\s+)?class\s+(\w+)/g;
        const interfaceRegex = /(?:public|private|protected|internal)?\s*interface\s+(\w+)/g;
        const methodRegex = /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(?:[\w<>\[\]?]+)\s+(\w+)\s*\(([^)]*)\)/g;
        const propertyRegex = /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:[\w<>\[\]?]+)\s+(\w+)\s*{\s*get/g;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'C# class',
            category: 'class',
          });
        }
        
        // Extract interfaces
        while ((match = interfaceRegex.exec(content)) !== null) {
          apis.push({
            signature: `interface ${match[1]}`,
            description: 'C# interface',
            category: 'interface',
          });
        }
        
        // Extract methods
        while ((match = methodRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
            apis.push({
              signature: `${name}(${params})`,
              description: 'C# method',
              category: 'method',
            });
          }
        }
      } else if (contentType === 'php') {
        // Extract from PHP source
        const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/g;
        const functionRegex = /(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
        const traitRegex = /trait\s+(\w+)/g;
        const interfaceRegex = /interface\s+(\w+)/g;
        
        let match;
        
        // Extract classes
        while ((match = classRegex.exec(content)) !== null) {
          apis.push({
            signature: `class ${match[1]}`,
            description: 'PHP class',
            category: 'class',
          });
        }
        
        // Extract functions
        while ((match = functionRegex.exec(content)) !== null) {
          const name = match[1];
          const params = match[2];
          apis.push({
            signature: `function ${name}(${params})`,
            description: 'PHP function',
            category: 'function',
          });
        }
      } else if (contentType === 'json' && content.includes('package.json')) {
        // Extract from package.json
        try {
          const pkg = JSON.parse(content);
          
          // Check exports field
          if (pkg.exports) {
            const addExport = (key: string, value: any) => {
              if (typeof value === 'string') {
                apis.push({
                  signature: key === '.' ? 'default export' : key,
                  description: `Exported from ${value}`,
                  category: 'export',
                });
              } else if (typeof value === 'object') {
                Object.entries(value).forEach(([k, v]: [string, any]) => {
                  addExport(k, v);
                });
              }
            };
            
            if (typeof pkg.exports === 'object') {
              Object.entries(pkg.exports).forEach(([key, value]: [string, any]) => {
                addExport(key, value);
              });
            }
          }
          
          // Check main field
          if (pkg.main) {
            apis.push({
              signature: 'main',
              description: `Main entry: ${pkg.main}`,
              category: 'export',
            });
          }
          
          // Check types field
          if (pkg.types || pkg.typings) {
            apis.push({
              signature: 'types',
              description: `TypeScript definitions: ${pkg.types || pkg.typings}`,
              category: 'export',
            });
          }
        } catch (error) {
          logError('extract-all-apis', error, { action: 'parse_package_json' });
        }
      }
      
      // Deduplicate APIs by signature
      const uniqueApis = [];
      const seen = new Set();
      
      for (const api of apis) {
        const key = api.signature;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueApis.push(api);
        }
      }
      
      const result = {
        apis: uniqueApis,
        success: true,
      };
      
      logToolExecution('extract-all-apis', { contentType }, { 
        apisFound: uniqueApis.length 
      });
      
      return result;
    } catch (error) {
      logError('extract-all-apis', error, { contentType });
      return {
        apis: [],
        success: false,
      };
    }
  },
});