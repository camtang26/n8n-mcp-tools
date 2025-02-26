import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';

interface FixWorkflowErrorInput {
  workflow_id: string;
  execution_id?: string;
  error_message?: string;
}

/**
 * Analyze and suggest fixes for workflow errors
 */
export async function fixWorkflowError(input: any): Promise<ExecuteResult> {
  try {
    const { workflow_id, execution_id, error_message } = input as FixWorkflowErrorInput;
    
    if (!workflow_id) {
      return {
        error: {
          message: 'Workflow ID is required'
        }
      };
    }
    
    // Get the workflow to analyze
    let workflow;
    try {
      workflow = await n8nApi.getWorkflow(workflow_id);
    } catch (error: any) {
      return {
        error: {
          message: `Failed to retrieve workflow: ${error.message}`
        }
      };
    }
    
    // Get execution details if an execution ID is provided
    let execution;
    let errorDetails;
    
    if (execution_id) {
      try {
        execution = await n8nApi.getExecution(execution_id);
        
        // Extract error information from the execution
        if (execution.data?.resultData?.error) {
          errorDetails = {
            message: execution.data.resultData.error.message,
            description: execution.data.resultData.error.description,
            node: execution.data.resultData.error.node
          };
        } else {
          // Look for errors in node executions
          for (const nodeName in execution.data?.resultData?.runData || {}) {
            const nodeRuns = execution.data.resultData.runData[nodeName];
            const lastRun = nodeRuns[nodeRuns.length - 1];
            
            if (lastRun?.error) {
              errorDetails = {
                message: lastRun.error.message,
                node: nodeName
              };
              break;
            }
          }
        }
      } catch (error: any) {
        // If we can't get execution details, continue with just the workflow
        console.warn(`Could not retrieve execution details: ${error.message}`);
      }
    }
    
    // Use the provided error message if execution didn't have errors
    if (!errorDetails && error_message) {
      errorDetails = {
        message: error_message
      };
    }
    
    if (!errorDetails) {
      return {
        error: {
          message: 'No error details found. Please provide an error message or a valid execution ID with errors.'
        }
      };
    }
    
    // Analyze the error and suggest fixes
    const analysis = analyzeError(errorDetails, workflow);
    
    return {
      data: {
        workflow_id,
        execution_id,
        error: errorDetails,
        analysis,
        message: 'Error analysis and fix suggestions generated successfully'
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to analyze workflow error: ${error.message}`
      }
    };
  }
}

/**
 * Analyze an error and suggest fixes
 */
function analyzeError(errorDetails: any, workflow: any): any {
  const { message, node } = errorDetails;
  const lowerMessage = message?.toLowerCase() || '';
  
  // Find the node with the error
  const errorNode = node ? workflow.nodes.find((n: any) => n.name === node) : null;
  
  // Check for common error patterns
  
  // Authentication errors
  if (
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('auth') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403')
  ) {
    return {
      errorType: 'authentication',
      description: 'This appears to be an authentication error.',
      suggestions: [
        'Check if the API key or credentials are valid and not expired',
        'Verify that you have the correct permissions for the requested resource',
        'Make sure the authentication method is correctly configured',
        errorNode ? `Update the credentials for the "${errorNode.name}" node` : 'Update the credentials'
      ]
    };
  }
  
  // Missing parameters or configuration
  if (
    lowerMessage.includes('missing') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('undefined') ||
    lowerMessage.includes('not found')
  ) {
    return {
      errorType: 'configuration',
      description: 'This appears to be a missing parameter or configuration error.',
      suggestions: [
        'Check that all required fields are filled in',
        'Verify that the referenced resource exists',
        errorNode ? `Review the configuration of the "${errorNode.name}" node` : 'Review node configurations'
      ]
    };
  }
  
  // Rate limiting
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('429')
  ) {
    return {
      errorType: 'rate-limit',
      description: 'This appears to be a rate limiting error.',
      suggestions: [
        'Implement a delay between requests',
        'Reduce the frequency of workflow execution',
        'Split large operations into smaller batches',
        'Check the API documentation for rate limits and adjust your workflow accordingly'
      ]
    };
  }
  
  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('unreachable')
  ) {
    return {
      errorType: 'network',
      description: 'This appears to be a network or connection error.',
      suggestions: [
        'Check your internet connection',
        'Verify that the API or service is online and accessible',
        'Increase timeout settings for the request',
        'Implement retry logic for transient network issues'
      ]
    };
  }
  
  // Data formatting
  if (
    lowerMessage.includes('format') ||
    lowerMessage.includes('parse') ||
    lowerMessage.includes('syntax') ||
    lowerMessage.includes('invalid json') ||
    lowerMessage.includes('invalid data')
  ) {
    return {
      errorType: 'data-format',
      description: 'This appears to be a data formatting or parsing error.',
      suggestions: [
        'Check the format of your input data',
        'Verify that JSON or XML is correctly structured',
        'Add a Function node to validate and format the data before processing',
        'Use JSONata or expression nodes to transform data into the expected format'
      ]
    };
  }
  
  // Generic suggestions
  return {
    errorType: 'unknown',
    description: 'This error doesn\'t match any common patterns.',
    suggestions: [
      'Check the node configuration and parameters',
      'Verify that all required fields are provided',
      'Test the API or service separately to ensure it\'s working correctly',
      'Add error handling nodes to catch and process errors',
      'Contact the n8n community or support for more specific help with this error'
    ]
  };
} 