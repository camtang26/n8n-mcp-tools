import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';

interface RunWorkflowInput {
  id: string;
  input_data?: any;
}

/**
 * Run a workflow and return the execution results
 */
export async function runWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { id, input_data } = input as RunWorkflowInput;
    
    if (!id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    // First, make sure the workflow exists
    try {
      await n8nApi.getWorkflow(id);
    } catch (error: any) {
      return {
        error: {
          message: `Workflow with ID ${id} not found: ${error.message}`
        }
      };
    }
    
    // Execute the workflow
    const execution = await n8nApi.executeWorkflow(id, input_data);
    
    // Check if execution was successful
    if (execution.status === 'failed') {
      return {
        error: {
          message: 'Workflow execution failed',
          execution: {
            id: execution.id,
            status: execution.status,
            startedAt: execution.startedAt,
            stoppedAt: execution.stoppedAt
          }
        }
      };
    }
    
    // Return successful execution data
    return {
      data: {
        execution: {
          id: execution.id,
          status: execution.status,
          startedAt: execution.startedAt,
          stoppedAt: execution.stoppedAt,
          data: execution.data
        },
        message: 'Workflow executed successfully'
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to run workflow: ${error.message}`
      }
    };
  }
} 