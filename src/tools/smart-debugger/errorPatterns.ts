/**
 * Error Patterns for n8n Smart Debugger
 * 
 * This file contains definitions of common n8n error patterns
 * and their potential causes to help with debugging.
 */

/**
 * N8n Error Pattern with fix suggestions
 */
export interface ErrorPattern {
  id: string;                    // Unique identifier for the error pattern
  name: string;                  // Human-readable name
  description: string;           // Description of the error
  regexPatterns: RegExp[];       // Regex patterns to match the error
  nodeTypes?: string[];          // Node types this error commonly occurs in
  possibleCauses: string[];      // Common causes of this error
  suggestedFixes: ErrorFix[];    // Suggested fixes
  detectionFunction?: (error: string, nodeType?: string) => boolean; // Optional custom detection
}

/**
 * Suggested fix for an error
 */
export interface ErrorFix {
  id: string;                    // Unique identifier for the fix
  description: string;           // Description of the fix
  difficulty: 'easy' | 'medium' | 'complex'; // How hard it is to implement
  nodeModifications?: {          // Modifications to make to the node
    parameters?: Record<string, any>; // Parameters to change
    credentials?: Record<string, any>; // Credentials to change
  };
  codeSnippet?: string;          // Code snippet for the fix
  requiresCredentials?: boolean; // Whether the fix requires credentials
  additionalInstructions?: string; // Additional instructions
}

/**
 * Auth Error Patterns
 */

// 401 Unauthorized errors
export const unauthorizedErrorPattern: ErrorPattern = {
  id: 'auth-401',
  name: 'Authentication Failed (401)',
  description: 'The API returned a 401 Unauthorized error, indicating invalid or missing authentication credentials.',
  regexPatterns: [
    /401 Unauthorized/i,
    /authentication failed/i,
    /invalid (api key|token|credentials)/i,
    /missing (api key|token|auth token)/i
  ],
  nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.twitter', 'n8n-nodes-base.slack'],
  possibleCauses: [
    'Missing API key or authentication token',
    'Expired credentials',
    'Invalid authentication method',
    'Incorrect API key or token format'
  ],
  suggestedFixes: [
    {
      id: 'auth-401-check-credentials',
      description: 'Check that valid credentials are provided and properly configured',
      difficulty: 'easy',
      additionalInstructions: 'Verify that the API key or token is correct and has not expired'
    },
    {
      id: 'auth-401-update-auth',
      description: 'Update the authentication method',
      difficulty: 'medium',
      nodeModifications: {
        parameters: {
          authentication: 'headerAuth',
          options: {
            headers: {
              Authorization: 'Bearer {{$credentials.apiKey}}'
            }
          }
        }
      }
    },
    {
      id: 'auth-401-create-credentials',
      description: 'Create proper credentials in n8n',
      difficulty: 'medium',
      requiresCredentials: true,
      additionalInstructions: 'Go to the n8n credentials manager to create or update the credentials for this node'
    }
  ]
};

// 403 Forbidden errors
export const forbiddenErrorPattern: ErrorPattern = {
  id: 'auth-403',
  name: 'Permission Denied (403)',
  description: 'The API returned a 403 Forbidden error, indicating the credentials lack the necessary permissions.',
  regexPatterns: [
    /403 Forbidden/i,
    /permission denied/i,
    /insufficient (permissions|access|scope)/i
  ],
  nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.googleSheets', 'n8n-nodes-base.twitter'],
  possibleCauses: [
    'The API key or token does not have the required permissions',
    'The user account has limited access',
    'Resource access is restricted',
    'Missing OAuth scopes'
  ],
  suggestedFixes: [
    {
      id: 'auth-403-check-permissions',
      description: 'Check that the credentials have the necessary permissions',
      difficulty: 'medium',
      additionalInstructions: 'Verify the permissions/scopes associated with your API key or token'
    },
    {
      id: 'auth-403-update-token',
      description: 'Update the token with additional permissions',
      difficulty: 'complex',
      requiresCredentials: true,
      additionalInstructions: 'Create a new token with expanded permissions in the service provider dashboard'
    }
  ]
};

/**
 * Data Validation Error Patterns
 */

// Invalid Input errors
export const invalidInputErrorPattern: ErrorPattern = {
  id: 'data-invalid-input',
  name: 'Invalid Input Data',
  description: 'The node received input data that does not match the expected format or validation rules.',
  regexPatterns: [
    /invalid (input|data|parameter|value)/i,
    /expected .* but received/i,
    /validation (failed|error)/i,
    /required (field|parameter) .* (is missing|not provided)/i
  ],
  possibleCauses: [
    'Missing required field in the input data',
    'Input data has the wrong format or type',
    'Invalid date format',
    'Value exceeds allowed limits'
  ],
  suggestedFixes: [
    {
      id: 'data-invalid-input-set',
      description: 'Add a Set node to ensure the input data is in the correct format',
      difficulty: 'easy',
      codeSnippet: `// Add this Set node before the problematic node
// Configure with the following values:
{
  "values": {
    "string": [
      {
        "name": "requiredField",
        "value": "default value"
      }
    ]
  },
  "options": {
    "dotNotation": true
  }
}`
    },
    {
      id: 'data-invalid-input-function',
      description: 'Add a Function node to transform the data into the expected format',
      difficulty: 'medium',
      codeSnippet: `// Add this Function node before the problematic node
return items.map(item => {
  // Ensure all required fields exist
  const data = {
    ...item.json,
    requiredField: item.json.requiredField || "default value",
    // Add other required fields and transformations
  };
  
  return { json: data };
});`
    }
  ]
};

// Type Mismatch errors
export const typeMismatchErrorPattern: ErrorPattern = {
  id: 'data-type-mismatch',
  name: 'Data Type Mismatch',
  description: 'The data type of a field does not match what the node or API expects.',
  regexPatterns: [
    /expected .* to be of type/i,
    /cannot convert .* to/i,
    /type error/i,
    /is not a function/i,
    /cannot read property .* of (undefined|null)/i
  ],
  possibleCauses: [
    'A string is provided where a number is expected',
    'An array is provided where an object is expected',
    'Attempting to use methods on null or undefined values',
    'Date formatting issues'
  ],
  suggestedFixes: [
    {
      id: 'data-type-mismatch-function',
      description: 'Add a Function node to convert the data to the correct type',
      difficulty: 'medium',
      codeSnippet: `// Add this Function node before the problematic node
return items.map(item => {
  const json = { ...item.json };
  
  // Convert fields to the correct types
  if (json.numericField && typeof json.numericField !== 'number') {
    json.numericField = Number(json.numericField);
  }
  
  // Handle nulls/undefined
  if (json.possiblyNullField === null || json.possiblyNullField === undefined) {
    json.possiblyNullField = ""; // or default value
  }
  
  return { json };
});`
    },
    {
      id: 'data-type-mismatch-if',
      description: 'Add an IF node to handle different data types',
      difficulty: 'medium',
      additionalInstructions: 'Add an IF node that branches based on the data type, with separate processing for each type'
    }
  ]
};

/**
 * Network Error Patterns
 */

// Connection Error Pattern
export const connectionErrorPattern: ErrorPattern = {
  id: 'network-connection-error',
  name: 'Network Connection Error',
  description: 'Failed to connect to the service or API due to network issues.',
  regexPatterns: [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /network (error|timeout)/i,
    /failed to (connect|reach)/i,
    /connection (refused|timed out|closed)/i
  ],
  nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.webhook'],
  possibleCauses: [
    'The service is down or unreachable',
    'Network connectivity issues',
    'DNS resolution problems',
    'Firewall blocking the connection',
    'Rate limiting or IP blocking'
  ],
  suggestedFixes: [
    {
      id: 'network-connection-retry',
      description: 'Add retry functionality to handle temporary network issues',
      difficulty: 'medium',
      nodeModifications: {
        parameters: {
          options: {
            retry: {
              count: 3,
              maxTimeout: 10000
            }
          }
        }
      }
    },
    {
      id: 'network-connection-check-url',
      description: 'Verify the URL or endpoint is correct and accessible',
      difficulty: 'easy',
      additionalInstructions: 'Check that the domain name is spelled correctly and that the service is running'
    }
  ]
};

// Rate Limiting Error Pattern
export const rateLimitErrorPattern: ErrorPattern = {
  id: 'network-rate-limit',
  name: 'Rate Limit Exceeded',
  description: 'The API rate limit has been exceeded, resulting in requests being rejected.',
  regexPatterns: [
    /rate limit (exceeded|reached)/i,
    /too many requests/i,
    /429 Too Many Requests/i,
    /try again later/i,
    /quota exceeded/i
  ],
  nodeTypes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.twitter', 'n8n-nodes-base.slack'],
  possibleCauses: [
    'Too many requests in a short time period',
    'Monthly or daily API quota exceeded',
    'IP-based rate limiting',
    'Aggressive polling or batch operations'
  ],
  suggestedFixes: [
    {
      id: 'network-rate-limit-throttle',
      description: 'Add throttling between requests',
      difficulty: 'medium',
      codeSnippet: `// If you're processing multiple items, use a Function node to add pauses:
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const items_copy = [...items];
const results = [];

// Process items with a delay between them
for (let i = 0; i < items_copy.length; i++) {
  results.push(items_copy[i]);
  if (i < items_copy.length - 1) {
    await delay(1000); // Wait 1 second between requests
  }
}

return results;`
    },
    {
      id: 'network-rate-limit-split',
      description: 'Split the operation into smaller batches',
      difficulty: 'complex',
      additionalInstructions: 'Use the SplitInBatches node to process data in smaller groups'
    }
  ]
};

/**
 * Node Configuration Error Patterns
 */

// Missing Node Configuration
export const missingConfigErrorPattern: ErrorPattern = {
  id: 'config-missing',
  name: 'Missing Node Configuration',
  description: 'The node is missing required configuration parameters.',
  regexPatterns: [
    /required parameter .* not provided/i,
    /missing (required|mandatory) (parameter|field)/i,
    /cannot be empty/i,
    /must be specified/i
  ],
  possibleCauses: [
    'Required parameter was not set',
    'Parameter was set but is empty',
    'Dynamic expression for a parameter failed to evaluate'
  ],
  suggestedFixes: [
    {
      id: 'config-missing-add-param',
      description: 'Add the missing parameter to the node configuration',
      difficulty: 'easy',
      additionalInstructions: 'Check the node documentation to identify the required parameters'
    },
    {
      id: 'config-missing-expression',
      description: 'Fix the expression used to set the parameter',
      difficulty: 'medium',
      additionalInstructions: 'Ensure that any expressions used to set parameter values are correctly formatted and reference existing data'
    }
  ]
};

// Invalid Node Configuration
export const invalidConfigErrorPattern: ErrorPattern = {
  id: 'config-invalid',
  name: 'Invalid Node Configuration',
  description: 'The node configuration contains invalid settings or incompatible options.',
  regexPatterns: [
    /invalid (configuration|setting|option)/i,
    /incompatible (option|setting)/i,
    /cannot use .* with/i,
    /unexpected (configuration|value)/i
  ],
  possibleCauses: [
    'Incompatible combination of settings',
    'Option selected that requires additional configuration',
    'Feature used that is no longer supported'
  ],
  suggestedFixes: [
    {
      id: 'config-invalid-review',
      description: 'Review the node configuration and correct incompatible settings',
      difficulty: 'medium',
      additionalInstructions: 'Check the node documentation for compatible option combinations'
    },
    {
      id: 'config-invalid-alternative',
      description: 'Use an alternative approach or node',
      difficulty: 'complex',
      additionalInstructions: 'Consider replacing the node with an alternative that provides similar functionality'
    }
  ]
};

/**
 * Runtime Error Patterns
 */

// Timeout Error Pattern
export const timeoutErrorPattern: ErrorPattern = {
  id: 'runtime-timeout',
  name: 'Execution Timeout',
  description: 'The operation took too long to complete and timed out.',
  regexPatterns: [
    /timeout (exceeded|occurred)/i,
    /operation timed out/i,
    /took too long/i,
    /deadline exceeded/i
  ],
  possibleCauses: [
    'The operation is processing too much data',
    'External service is slow to respond',
    'Complex operation exceeds the allowed execution time',
    'Network latency issues'
  ],
  suggestedFixes: [
    {
      id: 'runtime-timeout-optimize',
      description: 'Optimize the workflow to process less data or use pagination',
      difficulty: 'complex',
      additionalInstructions: 'Modify the workflow to process data in smaller batches or add filters to reduce the amount of data processed'
    },
    {
      id: 'runtime-timeout-increase',
      description: 'Increase the timeout setting if available',
      difficulty: 'easy',
      nodeModifications: {
        parameters: {
          options: {
            timeout: 120000 // 2 minutes in milliseconds
          }
        }
      }
    }
  ]
};

// Memory Error Pattern
export const memoryErrorPattern: ErrorPattern = {
  id: 'runtime-memory',
  name: 'Memory Limit Exceeded',
  description: 'The operation exceeded the available memory limit.',
  regexPatterns: [
    /memory limit exceeded/i,
    /out of memory/i,
    /heap (limit|OOM|allocation failed)/i,
    /javascript heap/i
  ],
  possibleCauses: [
    'Processing very large datasets',
    'Memory leaks in custom code',
    'Too many concurrent operations',
    'Large JSON objects or arrays'
  ],
  suggestedFixes: [
    {
      id: 'runtime-memory-batching',
      description: 'Process data in smaller batches',
      difficulty: 'complex',
      additionalInstructions: 'Modify the workflow to process data in smaller chunks using the SplitInBatches node'
    },
    {
      id: 'runtime-memory-optimize',
      description: 'Optimize memory usage in Function nodes',
      difficulty: 'complex',
      codeSnippet: `// Example of memory-optimized processing in a Function node
// Instead of loading all data into memory at once:
let result = [];
for (const item of items) {
  // Process one item at a time
  const processed = {
    // Extract only the fields you need
    id: item.json.id,
    name: item.json.name,
    // Avoid deep copying or keeping references to large objects
  };
  result.push({ json: processed });
}
return result;`
    }
  ]
};

/**
 * Export all error patterns
 */
export const errorPatterns: ErrorPattern[] = [
  unauthorizedErrorPattern,
  forbiddenErrorPattern,
  invalidInputErrorPattern,
  typeMismatchErrorPattern,
  connectionErrorPattern,
  rateLimitErrorPattern,
  missingConfigErrorPattern,
  invalidConfigErrorPattern,
  timeoutErrorPattern,
  memoryErrorPattern
]; 