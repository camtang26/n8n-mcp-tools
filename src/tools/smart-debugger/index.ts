/**
 * Smart Debugger for n8n Workflows
 * 
 * Analyzes n8n workflow execution logs to identify errors,
 * determine root causes, and suggest fixes.
 */

import { ExecuteParams, ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';
import { N8nExecution, N8nWorkflow, N8nNode, N8nError } from '../../schemas/n8nSchemas';
import { errorPatterns, ErrorPattern, ErrorFix } from './errorPatterns';

/**
 * Input for the analyzeWorkflowError function
 */
interface DebuggerInput {
  workflowId?: string;          // Optional workflow ID to analyze
  errorType?: string;           // Type of error (e.g., "401", "timeout")
  nodeType?: string;            // Type of node where error occurred
  logContent?: string;          // Raw log content to analyze
  executionId?: string;         // Specific execution to analyze
}

/**
 * Output for the analyzeWorkflowError function
 */
interface DebuggerOutput {
  analysis: {
    errorType: string;          // Identified error type
    errorLocation: {            // Where the error occurred
      nodeId?: string;
      nodeName?: string;
      nodeType?: string;
    };
    rootCause: string;          // Root cause analysis
    suggestedFixes: {           // Array of possible fixes
      description: string;       // Description of the fix
      difficulty: 'easy' | 'medium' | 'complex'; // How hard to implement
      nodeModifications?: any;   // Specific node modifications
      code?: string;             // Code to implement the fix
    }[];
    relatedErrors?: string[];   // Similar errors that might be fixed
  };
}

/**
 * Extract error information from execution logs
 */
async function parseErrorLogs(input: DebuggerInput): Promise<N8nError> {
  const error: N8nError = {
    message: '',
    type: 'unknown'
  };
  
  // If logContent is provided, extract information from it
  if (input.logContent) {
    error.message = input.logContent;
    
    // Try to determine node information from the log content
    const nodeMatch = input.logContent.match(/node "([^"]+)"/i);
    if (nodeMatch) {
      error.nodeName = nodeMatch[1];
    }
    
    const nodeTypeMatch = input.logContent.match(/node type "([^"]+)"/i);
    if (nodeTypeMatch) {
      error.nodeType = nodeTypeMatch[1];
    }
    
    // If errorType is provided in input, use it
    if (input.errorType) {
      error.type = determineErrorType(input.errorType);
    } else {
      error.type = determineErrorTypeFromMessage(error.message);
    }
  }
  // If an execution ID is provided, get execution details from the API
  else if (input.executionId) {
    try {
      const execution = await n8nApi.getExecution(input.executionId);
      error.executionId = input.executionId;
      error.workflowId = input.workflowId || execution.workflowId;
      
      // Extract error information from the execution
      if (execution.data?.resultData?.error) {
        error.message = execution.data.resultData.error.message || '';
        error.description = execution.data.resultData.error.description || '';
        
        // Check for node-specific errors
        if (execution.data.resultData.error.stack) {
          error.description = (error.description + ' ' + execution.data.resultData.error.stack).trim();
        }
        
        // Try to find the node where the error occurred
        if (execution.data.resultData.error.node) {
          error.nodeId = execution.data.resultData.error.node;
          
          // Get node details from execution data
          const workflow = execution.data.workflowData;
          const errorNode = workflow.nodes.find(n => n.id === error.nodeId);
          if (errorNode) {
            error.nodeName = errorNode.name;
            error.nodeType = errorNode.type;
          }
        }
      }
      
      // If we still don't have an error message, check the last failed node
      if (!error.message && execution.data?.resultData?.runData) {
        for (const [nodeName, nodeData] of Object.entries(execution.data.resultData.runData)) {
          // Type assertion to handle the unknown type
          const typedNodeData = nodeData as { error?: { message: string }; }[];
          const lastRun = typedNodeData[typedNodeData.length - 1];
          
          if (lastRun?.error) {
            error.message = lastRun.error.message || 'Execution failed';
            error.nodeName = nodeName;
            
            // Try to find node type from workflow data
            const workflow = execution.data.workflowData;
            const errorNode = workflow.nodes.find(n => n.name === nodeName);
            if (errorNode) {
              error.nodeId = errorNode.id;
              error.nodeType = errorNode.type;
            }
            
            break;
          }
        }
      }
      
      // Determine error type
      error.type = determineErrorTypeFromMessage(error.message);
    } catch (err: any) {
      error.message = `Failed to retrieve execution: ${err.message}`;
    }
  }
  // If only workflowId is provided, get the latest failed execution
  else if (input.workflowId) {
    try {
      error.workflowId = input.workflowId;
      
      // Get recent executions for the workflow
      const executions = await n8nApi.getExecutions(input.workflowId, 10);
      
      // Find the most recent failed execution
      const failedExecution = executions.find(e => e.status === 'error' || e.status === 'crashed');
      
      if (failedExecution) {
        // Recursively call parseErrorLogs with the execution ID
        return parseErrorLogs({
          ...input,
          executionId: failedExecution.id,
        });
      } else {
        error.message = 'No failed executions found for this workflow';
      }
    } catch (err: any) {
      error.message = `Failed to retrieve workflow executions: ${err.message}`;
    }
  }
  // If only error type is provided
  else if (input.errorType) {
    error.message = `Error type: ${input.errorType}`;
    error.type = determineErrorType(input.errorType);
    
    if (input.nodeType) {
      error.nodeType = input.nodeType;
    }
  } else {
    error.message = 'Insufficient error information provided';
  }
  
  return error;
}

/**
 * Determine error type from an error type string
 */
function determineErrorType(errorType: string): N8nError['type'] {
  const errorTypeLower = errorType.toLowerCase();
  
  if (errorTypeLower.includes('auth') || errorTypeLower.includes('401') || errorTypeLower.includes('403')) {
    return 'authentication';
  }
  if (errorTypeLower.includes('credential')) {
    return 'credential';
  }
  if (errorTypeLower.includes('rate') || errorTypeLower.includes('429')) {
    return 'rate-limit';
  }
  if (errorTypeLower.includes('network') || errorTypeLower.includes('connection')) {
    return 'network';
  }
  if (errorTypeLower.includes('node') || errorTypeLower.includes('workflow')) {
    return errorTypeLower.includes('node') ? 'node' : 'workflow';
  }
  
  return 'unknown';
}

/**
 * Determine error type from an error message
 */
function determineErrorTypeFromMessage(message: string): N8nError['type'] {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('401') || messageLower.includes('unauthorized') || 
      messageLower.includes('authentication failed') || messageLower.includes('invalid api key')) {
    return 'authentication';
  }
  if (messageLower.includes('403') || messageLower.includes('forbidden') || 
      messageLower.includes('permission denied')) {
    return 'authentication';
  }
  if (messageLower.includes('credential') || messageLower.includes('api key')) {
    return 'credential';
  }
  if (messageLower.includes('rate limit') || messageLower.includes('429') || 
      messageLower.includes('too many requests')) {
    return 'rate-limit';
  }
  if (messageLower.includes('network') || messageLower.includes('connection') || 
      messageLower.includes('timeout') || messageLower.includes('unreachable') ||
      messageLower.includes('econnrefused') || messageLower.includes('etimedout')) {
    return 'network';
  }
  
  // If no specific type is identified, default to either node or workflow error
  return messageLower.includes('node') ? 'node' : 'workflow';
}

/**
 * Identify matching error patterns
 */
function identifyErrorPattern(error: N8nError): ErrorPattern | null {
  // Check each error pattern
  for (const pattern of errorPatterns) {
    // Check if node type matches (if specified in the pattern and error)
    if (pattern.nodeTypes && error.nodeType && 
        !pattern.nodeTypes.includes(error.nodeType)) {
      continue;
    }
    
    // Check if any regex pattern matches
    const matches = pattern.regexPatterns.some(regex => 
      regex.test(error.message) || (error.description && regex.test(error.description))
    );
    
    if (matches) {
      return pattern;
    }
    
    // Check with custom detection function if available
    if (pattern.detectionFunction && 
        pattern.detectionFunction(error.message, error.nodeType)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Generate fix suggestions based on the error pattern and node type
 */
function generateFixSuggestions(errorPattern: ErrorPattern | null, error: N8nError): ErrorFix[] {
  // If no pattern matched, provide generic suggestions
  if (!errorPattern) {
    return [
      {
        id: 'generic-check-config',
        description: 'Check node configuration for errors or missing values',
        difficulty: 'easy',
        additionalInstructions: 'Review the node parameters and ensure all required fields are filled correctly'
      },
      {
        id: 'generic-check-docs',
        description: 'Review n8n documentation for the node type',
        difficulty: 'easy',
        additionalInstructions: error.nodeType 
          ? `Check the documentation for ${error.nodeType} node to ensure correct usage` 
          : 'Check the n8n documentation for the node type to ensure correct usage'
      }
    ];
  }
  
  // Return the fixes from the matched pattern
  return errorPattern.suggestedFixes;
}

/**
 * Determine root cause based on error pattern and details
 */
function determineRootCause(errorPattern: ErrorPattern | null, error: N8nError): string {
  if (!errorPattern) {
    // Generate generic root cause description
    if (error.type === 'authentication') {
      return 'Authentication issue: The workflow cannot authenticate with the required service.';
    }
    if (error.type === 'credential') {
      return 'Credential issue: There is a problem with the credentials used in the workflow.';
    }
    if (error.type === 'network') {
      return 'Network issue: The workflow cannot connect to a required service or API.';
    }
    if (error.type === 'rate-limit') {
      return 'Rate limit exceeded: The API is rejecting requests due to too many requests in a short time period.';
    }
    
    return `The workflow encountered an error, possibly in the ${error.nodeName || 'execution'} step.`;
  }
  
  // Construct detailed root cause from the pattern
  let rootCause = errorPattern.description;
  
  // Add node context if available
  if (error.nodeName) {
    rootCause += ` This occurred in the "${error.nodeName}" node.`;
  }
  
  // Add the most likely cause from the pattern
  if (errorPattern.possibleCauses.length > 0) {
    rootCause += ` The most likely cause is: ${errorPattern.possibleCauses[0]}`;
  }
  
  return rootCause;
}

/**
 * Find related errors that might be addressed at the same time
 */
function findRelatedErrors(errorPattern: ErrorPattern | null): string[] {
  if (!errorPattern) {
    return [];
  }
  
  // Return related errors based on the error type
  switch (errorPattern.id.split('-')[0]) {
    case 'auth':
      return [
        'Check all authentication settings in the workflow',
        'Verify that all API keys and tokens are valid and not expired',
        'Consider rotating credentials if they might be compromised'
      ];
    case 'data':
      return [
        'Review data structure throughout the workflow',
        'Add data validation nodes to ensure consistent formats',
        'Check for any data transformations that might be losing required fields'
      ];
    case 'network':
      return [
        'Verify connectivity to all external services',
        'Check for any rate limiting on all API calls',
        'Consider adding retry logic to handle intermittent issues'
      ];
    case 'config':
      return [
        'Review configuration of all similar nodes',
        'Check for consistent configuration across the workflow',
        'Consider using environment variables for configuration values'
      ];
    case 'runtime':
      return [
        'Check for operations that might be consuming excessive resources',
        'Review any custom code for performance issues',
        'Consider breaking complex operations into smaller steps'
      ];
    default:
      return [];
  }
}

/**
 * Format node modifications for display
 */
function formatNodeModifications(fix: ErrorFix): any {
  if (!fix.nodeModifications) {
    return undefined;
  }
  
  return fix.nodeModifications;
}

/**
 * Analyze workflow error and suggest fixes
 */
export async function analyzeWorkflowError(params: ExecuteParams): Promise<ExecuteResult> {
  try {
    const input = params.input as DebuggerInput;
    
    // Parse logs or get error details
    const errorDetails = await parseErrorLogs(input);
    
    // Identify the error pattern
    const errorPattern = identifyErrorPattern(errorDetails);
    
    // Generate fix suggestions
    const suggestedFixes = generateFixSuggestions(
      errorPattern, 
      errorDetails
    );
    
    // Format node modifications for each fix
    const formattedFixes = suggestedFixes.map(fix => {
      const result: any = {
        description: fix.description,
        difficulty: fix.difficulty
      };
      
      if (fix.nodeModifications) {
        result.nodeModifications = formatNodeModifications(fix);
      }
      
      if (fix.codeSnippet) {
        result.code = fix.codeSnippet;
      }
      
      if (fix.additionalInstructions) {
        result.additionalInstructions = fix.additionalInstructions;
      }
      
      return result;
    });
    
    // Determine root cause
    const rootCause = determineRootCause(errorPattern, errorDetails);
    
    // Find related errors
    const relatedErrors = findRelatedErrors(errorPattern);
    
    return {
      data: {
        analysis: {
          errorType: errorDetails.type,
          errorLocation: {
            nodeId: errorDetails.nodeId,
            nodeName: errorDetails.nodeName,
            nodeType: errorDetails.nodeType
          },
          rootCause,
          suggestedFixes: formattedFixes,
          relatedErrors
        }
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Failed to analyze workflow error',
        stack: error.stack
      }
    };
  }
} 