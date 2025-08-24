
import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { logger } from './config/logger';

// Import tools
import { fetchRepoContent } from './tools/fetch-repo-content';
import { parseMarkdown } from './tools/parse-markdown';
import { extractCodePatterns } from './tools/extract-code-patterns';
import { generateOutput } from './tools/generate-output';
import { fetchAllDocs } from './tools/fetch-all-docs';
import { extractAllApis } from './tools/extract-all-apis';
import { analyzeRepository } from './tools/analyze-repository';
import { scrapeDocumentation } from './tools/scrape-documentation';
import { fetchRegistryDocs } from './tools/fetch-registry-docs';

// Import agents
import { documentationAnalyzer } from './agents/documentation-analyzer';
import { apiExtractor } from './agents/api-extractor';
import { patternIdentifier } from './agents/pattern-identifier';
import { comprehensiveDocGenerator } from './agents/comprehensive-doc-generator';

// Import workflows
import { generateContextIndex } from './workflows/generate-context-index';

export const mastra = new Mastra({
  storage: new LibSQLStore({
    url: 'file:../mastra.db',
  }),
  logger,
  agents: {
    'documentation-analyzer': documentationAnalyzer,
    'api-extractor': apiExtractor,
    'pattern-identifier': patternIdentifier,
    'comprehensive-doc-generator': comprehensiveDocGenerator,
  },
  workflows: {
    'generate-context-index': generateContextIndex,
  },
});
