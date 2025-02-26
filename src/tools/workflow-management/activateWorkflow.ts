import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';

interface ActivateWorkflowInput {
  id: string;
  active: boolean;
}

/**
 * Activate or deactivate a workflow
 */
export async function activateWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { id, active } = input as ActivateWorkflowInput;
    
    if (!id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    if (active === undefined) {
      return {
        error: {
          message: 'Active status is required'
        }
      };
    }
    
    // Call the n8n API to activate/deactivate the workflow
    const workflow = await n8nApi.setWorkflowActive(id, active);
    
    return {
      data: {
        workflow,
        message: `Workflow ${active ? 'activated' : 'deactivated'} successfully`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to ${input.active ? 'activate' : 'deactivate'} workflow: ${error.message}`
      }
    };
  }
} 