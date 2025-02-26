import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';

interface GetExecutionLogsInput {
  workflow_id: string;
  execution_id?: string;
  limit?: number;
}

/**
 * Retrieve execution logs for debugging
 */
export async function getExecutionLogs(input: any): Promise<ExecuteResult> {
  try {
    const { workflow_id, execution_id, limit = 10 } = input as GetExecutionLogsInput;
    
    if (!workflow_id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    // If an execution ID is provided, get details for that specific execution
    if (execution_id) {
      try {
        const execution = await n8nApi.getExecution(execution_id);
        
        return {
          data: {
            execution,
            message: `Execution details retrieved successfully`
          }
        };
      } catch (error: any) {
        return {
          error: {
            message: `Failed to retrieve execution details: ${error.message}`
          }
        };
      }
    }
    
    // Otherwise, get recent executions for the workflow
    const executions = await n8nApi.getExecutions(workflow_id, limit);
    
    return {
      data: {
        executions,
        count: executions.length,
        workflow_id,
        message: `Retrieved ${executions.length} execution logs`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to retrieve execution logs: ${error.message}`
      }
    };
  }
} 