
import { mastra } from './mastra';

async function generateRepoIndex(repoUrl: string) {
  try {
    console.log(`Generating context index for: ${repoUrl}`);
    
    const workflow = mastra.getWorkflows()['generate-context-index'];
    const run = workflow.createRun();
    const result = await run.start({
      inputData: {
        repoUrl,
      }
    });
    
    console.log('Generated Context Index:');
    if (result.status === 'success') {
      console.log(result.result.markdown);
    } else {
      console.error('Workflow failed:', result);
    }
    
    // Optionally save to file
    // await Deno.writeTextFile(`./${repoUrl.split('/').pop()}-context-index.md`, result.markdown);
    
  } catch (error) {
    console.error('Error generating context index:', error);
  }
}

// Example usage
// generateRepoIndex('https://github.com/exceljs/exceljs');

export { generateRepoIndex };
