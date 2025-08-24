import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '../../../src/mastra/index';

// Configure route segment config for timeout
export const maxDuration = 600; // 600 seconds (10 minutes) for reasoning model processing
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json();
    
    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    console.log(`Starting workflow for repository: ${repoUrl}`);
    console.log(`Using reasoning model - this may take several minutes for large repositories`);
    const startTime = Date.now();

    const workflow = mastra.getWorkflows()['generate-context-index'];
    const run = await workflow.createRunAsync();
    
    // Let the workflow run without artificial timeout constraints
    // The reasoning model needs time to process comprehensively
    const result = await run.start({
      inputData: {
        repoUrl,
      }
    });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Workflow completed in ${duration}s`);
    
    if (result.status === 'success') {
      return NextResponse.json({
        success: true,
        markdown: result.result.markdown,
        repoUrl,
        processingTime: duration,
      });
    } else {
      return NextResponse.json(
        { error: 'Workflow failed', details: result },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in generate API:', error);
    
    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout', 
          message: 'The repository is too large to process. Try a smaller repository or specific documentation files.',
          suggestion: 'Consider breaking down the request into smaller parts'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}