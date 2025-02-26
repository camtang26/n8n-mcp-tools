import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';

interface DeleteWorkflowInput {
  id: string;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { id } = input as DeleteWorkflowInput;
    
    if (!id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    // Get the workflow name before deletion for the response message
    let workflowName = 'Workflow';
    try {
      const workflow = await n8nApi.getWorkflow(id);
      workflowName = workflow.name;
    } catch (error) {
      // If we can't get the workflow, continue with the deletion anyway
      console.warn(`Could not get workflow name before deletion: ${(error as Error).message}`);
    }
    
    // Call the n8n API to delete the workflow
    await n8nApi.deleteWorkflow(id);
    
    return {
      data: {
        id,
        message: `Workflow "${workflowName}" deleted successfully`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to delete workflow: ${error.message}`
      }
    };
  }
} 