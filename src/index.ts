
//!/usr/bin/env node

import { mastra } from './mastra/index.js';
import { generateRepoIndex } from './example.js';
import { logWorkflowStart, logWorkflowEnd, logError, logger } from './mastra/config/logger.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Get repository URL from command line arguments
  const args = process.argv.slice(2);
  const repoUrl = args[0];
  
  if (!repoUrl) {
    console.log('Usage: npm start <repository-url>');
    console.log('Example: npm start https://github.com/exceljs/exceljs');
    process.exit(1);
  }
  
  try {
    console.log(`🚀 Generating context index for: ${repoUrl}\n`);
    console.log('📊 Progress will be logged to: logs/workflow.log\n');
    
    // Log workflow start
    const startTime = Date.now();
    logWorkflowStart('generate-context-index', { repoUrl });
    
    // Initialize system components
    console.log('✅ System components loaded successfully:');
    console.log('  • Documentation Analyzer Agent');
    console.log('  • API Extractor Agent');
    console.log('  • Pattern Identifier Agent');
    console.log('  • Fetch Repository Content Tool');
    console.log('  • Parse Markdown Tool');
    console.log('  • Extract Code Patterns Tool');
    console.log('  • Generate Output Tool');
    console.log('  • Generate Context Index Workflow');
    console.log('  • Logger (FileTransport)');
    
    // Execute the workflow
    console.log('\n📋 Starting workflow execution...');
    console.log('Check logs/workflow.log for detailed progress\n');
    
    // Execute the actual workflow
    const workflow = mastra.getWorkflows()['generate-context-index'];
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        repoUrl,
      }
    });
    
    if (result.status === 'success') {
      logWorkflowEnd('generate-context-index', result.result, Date.now() - startTime);
      
      console.log('\n✅ Workflow completed successfully!');
      console.log('📄 Check logs/workflow.log for full execution details');
      
      // Display the generated markdown
      console.log('\n📝 Generated Context Index:\n');
      console.log(result.result.markdown);
      
      // Optionally save to file
      const outputFile = `./${repoUrl.split('/').pop()}-context-index.md`;
      const fs = await import('fs/promises');
      await fs.writeFile(outputFile, result.result.markdown);
      console.log(`\n💾 Saved to: ${outputFile}`);
    } else {
      console.error('\n❌ Workflow failed:', result);
      logError('workflow-execution', new Error('Workflow failed'), result);
    }
    
    console.log('\n💡 To use this system with real data:');
    console.log('1. Ensure you have set OPENAI_API_KEY environment variable');
    console.log('2. Run: npm start <repository-url>');
    console.log('3. Monitor progress in logs/workflow.log');
    console.log('4. Output will be generated as markdown');
    
  } catch (error) {
    console.error('❌ Error:', error);
    logError('main', error, { repoUrl });
  }
}

// Run the main function if this file is executed directly
// Use require.main for CommonJS compatibility
if (require.main === module) {
  main();
}
