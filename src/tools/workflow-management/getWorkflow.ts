import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';

interface GetWorkflowInput {
  id: string;
}

/**
 * Get a specific workflow by ID
 */
export async function getWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { id } = input as GetWorkflowInput;
    
    if (!id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    // Call the n8n API to get the workflow
    const workflow = await n8nApi.getWorkflow(id);
    
    return {
      data: {
        workflow
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to get workflow: ${error.message}`
      }
    };
  }
} 