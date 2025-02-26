import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';

interface CreateWorkflowInput {
  name: string;
  description: string;
  activate?: boolean;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { name, description, activate = false } = input as CreateWorkflowInput;
    
    if (!name || !description) {
      return {
        error: {
          message: 'Workflow name and description are required'
        }
      };
    }
    
    // Create a basic workflow structure
    const workflowData = {
      name,
      nodes: [
        {
          parameters: {},
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [250, 300]
        }
      ],
      connections: {},
      active: activate,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      },
      tags: [],
      description
    };
    
    // Call the n8n API to create the workflow
    const workflow = await n8nApi.createWorkflow(workflowData);
    
    return {
      data: {
        workflow,
        message: `Workflow "${name}" created successfully`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to create workflow: ${error.message}`
      }
    };
  }
} 