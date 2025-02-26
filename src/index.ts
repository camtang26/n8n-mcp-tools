// Define types locally instead of importing from SDK
interface Manifest {
  version: string;
  name: string;
  description: string;
  tools: Array<{
    name: string;
    description: string;
    input_schema?: any;
  }>;
}

interface ExecuteParams {
  tool: string;
  input: any;
}

interface ExecuteResult {
  data?: any;
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
}

// Mock SDK import for the server creation function
const createServer = (options: {
  manifest: Manifest;
  execute: (params: ExecuteParams) => Promise<ExecuteResult>;
  transport?: 'stdio' | 'http' | 'sse';
}) => {
  // Implementation provided by the actual SDK
  const mcpSdk = require('@modelcontextprotocol/sdk');
  return mcpSdk.createServer(options);
};

import dotenv from 'dotenv';
import path from 'path';

// Import our tool implementations
import { listWorkflows } from './tools/workflow-management/listWorkflows';
import { getWorkflow } from './tools/workflow-management/getWorkflow';
import { createWorkflow } from './tools/workflow-management/createWorkflow';
import { activateWorkflow } from './tools/workflow-management/activateWorkflow';
import { deleteWorkflow } from './tools/workflow-management/deleteWorkflow';
import { createResearchWorkflow } from './tools/workflow-development/createResearchWorkflow';
import { createSocialPostWorkflow } from './tools/workflow-development/createSocialPostWorkflow';
import { generateNode } from './tools/workflow-development/generateNode';
import { runWorkflow } from './tools/debugging/runWorkflow';
import { getExecutionLogs } from './tools/debugging/getExecutionLogs';
import { fixWorkflowError } from './tools/debugging/fixWorkflowError';
import { listTemplates } from './tools/templates/listTemplates';
import { applyTemplate } from './tools/templates/applyTemplate';

// Import the new tools we've implemented
import { generateWorkflow } from './tools/workflow-generator';
import { analyzeWorkflowError } from './tools/smart-debugger';
import expressionBuilderTool from './tools/expression-builder';
import convertWorkflowTool from './tools/workflow-code-converter';
import commonInfrastructureTools from './tools/common-infrastructure';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define our MCP server manifest
const manifest: Manifest = {
  version: '0.1.0',
  name: 'n8n-mcp-tools',
  description: 'MCP server exposing n8n workflow tools to Cursor and other MCP clients',
  tools: [
    // Workflow Management Tools
    {
      name: 'n8n/list_workflows',
      description: 'List all existing workflows with their activation status',
      input_schema: {
        type: 'object',
        properties: {
          filter: { 
            type: 'string', 
            description: 'Optional filter to apply to workflow listing (e.g., "active", "inactive", "tag:social")'
          }
        }
      }
    },
    {
      name: 'n8n/get_workflow',
      description: 'View details of a specific workflow',
      input_schema: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'ID of the workflow to retrieve'
          }
        },
        required: ['id']
      }
    },
    {
      name: 'n8n/create_workflow',
      description: 'Generate a new workflow from a description',
      input_schema: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Name for the new workflow'
          },
          description: { 
            type: 'string', 
            description: 'Detailed description of what the workflow should do'
          },
          activate: { 
            type: 'boolean', 
            description: 'Whether to activate the workflow upon creation'
          }
        },
        required: ['name', 'description']
      }
    },
    {
      name: 'n8n/activate_workflow',
      description: 'Activate or deactivate a workflow',
      input_schema: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'ID of the workflow to activate/deactivate'
          },
          active: { 
            type: 'boolean', 
            description: 'Whether to activate (true) or deactivate (false) the workflow'
          }
        },
        required: ['id', 'active']
      }
    },
    {
      name: 'n8n/delete_workflow',
      description: 'Remove a workflow',
      input_schema: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'ID of the workflow to delete'
          }
        },
        required: ['id']
      }
    },
    
    // Workflow Development Tools
    {
      name: 'n8n/create_research_workflow',
      description: 'Generate a specialized research workflow with proper node configuration',
      input_schema: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Name for the research workflow'
          },
          description: { 
            type: 'string', 
            description: 'Description of what kind of research this workflow should perform'
          },
          research_sources: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Sources to include in the research workflow (e.g., "google", "twitter", "reddit")'
          }
        },
        required: ['name', 'description']
      }
    },
    {
      name: 'n8n/create_social_post_workflow',
      description: 'Generate a workflow for posting to social media',
      input_schema: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Name for the social post workflow'
          },
          platforms: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Social media platforms to post to (e.g., "twitter", "linkedin", "facebook")'
          },
          content_source: { 
            type: 'string', 
            description: 'Source of the content to post (e.g., "manual", "rss", "research_workflow")'
          }
        },
        required: ['name', 'platforms']
      }
    },
    {
      name: 'n8n/generate_node',
      description: 'Create JSON for a specific node type with proper configuration',
      input_schema: {
        type: 'object',
        properties: {
          node_type: { 
            type: 'string', 
            description: 'Type of node to generate (e.g., "HttpRequest", "Twitter", "Function")'
          },
          config_description: { 
            type: 'string', 
            description: 'Description of how the node should be configured'
          }
        },
        required: ['node_type', 'config_description']
      }
    },
    
    // Debugging Tools
    {
      name: 'n8n/run_workflow',
      description: 'Execute a workflow and return results',
      input_schema: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'ID of the workflow to run'
          },
          input_data: { 
            type: 'object', 
            description: 'Input data for the workflow execution'
          }
        },
        required: ['id']
      }
    },
    {
      name: 'n8n/get_execution_logs',
      description: 'Retrieve execution logs for debugging',
      input_schema: {
        type: 'object',
        properties: {
          workflow_id: { 
            type: 'string', 
            description: 'ID of the workflow to get logs for'
          },
          execution_id: { 
            type: 'string', 
            description: 'Specific execution ID (optional)'
          },
          limit: { 
            type: 'number', 
            description: 'Maximum number of logs to retrieve'
          }
        },
        required: ['workflow_id']
      }
    },
    {
      name: 'n8n/fix_workflow_error',
      description: 'Analyze and suggest fixes for common workflow errors',
      input_schema: {
        type: 'object',
        properties: {
          workflow_id: { 
            type: 'string', 
            description: 'ID of the workflow with errors'
          },
          execution_id: { 
            type: 'string', 
            description: 'Specific execution ID with the error'
          },
          error_message: { 
            type: 'string', 
            description: 'Error message to analyze (optional if execution_id is provided)'
          }
        },
        required: ['workflow_id']
      }
    },
    
    // Template Tools
    {
      name: 'n8n/list_templates',
      description: 'List available workflow templates',
      input_schema: {
        type: 'object',
        properties: {
          category: { 
            type: 'string', 
            description: 'Category of templates to list (e.g., "social", "research", "all")'
          }
        }
      }
    },
    {
      name: 'n8n/apply_template',
      description: 'Apply a template to create a new workflow',
      input_schema: {
        type: 'object',
        properties: {
          template_id: { 
            type: 'string', 
            description: 'ID of the template to apply'
          },
          name: { 
            type: 'string', 
            description: 'Name for the new workflow based on the template'
          },
          parameters: { 
            type: 'object', 
            description: 'Custom parameters to apply to the template'
          }
        },
        required: ['template_id', 'name']
      }
    },
    
    // Workflow Generation Assistant
    {
      name: 'n8n/generate_workflow',
      description: 'Generate an n8n workflow from natural language description',
      input_schema: {
        type: 'object',
        properties: {
          description: { 
            type: 'string', 
            description: 'Natural language description of the workflow'
          },
          requiredNodes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of node types that must be included'
          },
          complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
            description: 'Desired complexity level of the workflow'
          },
          includeCredentials: {
            type: 'boolean',
            description: 'Whether to include credential setup instructions'
          }
        },
        required: ['description']
      }
    },
    
    // Smart Debugger
    {
      name: 'n8n/analyze_error',
      description: 'Analyze n8n workflow errors and suggest fixes',
      input_schema: {
        type: 'object',
        properties: {
          workflowId: { 
            type: 'string', 
            description: 'ID of the workflow with errors'
          },
          errorType: { 
            type: 'string', 
            description: 'Type of error (e.g., "401", "timeout")'
          },
          nodeType: { 
            type: 'string', 
            description: 'Type of node where error occurred'
          },
          logContent: { 
            type: 'string', 
            description: 'Raw log content to analyze'
          },
          executionId: { 
            type: 'string', 
            description: 'Specific execution to analyze'
          }
        }
      }
    },
    
    // Expression Builder
    {
      name: 'n8n/build_expression',
      description: 'Create n8n expressions from natural language descriptions',
      input_schema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Description of what you want to achieve with the expression'
          },
          category: {
            type: 'string',
            enum: [
              'data-access',
              'string-manipulation',
              'date-time',
              'number-math',
              'array-manipulation',
              'object-manipulation',
              'conditional',
              'node-reference'
            ],
            description: 'Optionally filter by expression category'
          },
          sampleData: {
            type: 'object',
            description: 'Sample data to test the expression with'
          },
          workflowContext: {
            type: 'object',
            properties: {
              previousNodes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of previous nodes in the workflow'
              },
              currentNodeType: {
                type: 'string',
                description: 'Type of the current node'
              },
              dataStructure: {
                type: 'object',
                description: 'Structure of the data in the workflow'
              }
            }
          }
        },
        required: ['description']
      }
    },
    
    // Workflow-as-Code Converter
    {
      name: 'n8n/convert_workflow',
      description: 'Convert n8n workflows to code representations',
      input_schema: {
        type: 'object',
        properties: {
          workflow: {
            oneOf: [
              { type: 'string' },
              { type: 'object' }
            ],
            description: 'The workflow JSON string or code to convert'
          },
          targetFormat: {
            type: 'string',
            enum: ['typescript', 'javascript', 'python', 'json'],
            description: 'The target format to convert to'
          },
          workflowName: {
            type: 'string',
            description: 'Optional name for the workflow in the generated code'
          },
          includeComments: {
            type: 'boolean',
            description: 'Whether to include detailed comments in the generated code',
            default: true
          },
          includeImports: {
            type: 'boolean',
            description: 'Whether to include import statements in code output',
            default: true
          }
        },
        required: ['workflow', 'targetFormat']
      }
    },
    
    // Common Infrastructure Tools
    {
      name: 'n8n/deploy_workflow',
      description: 'Deploy a workflow to one or more environments',
      input_schema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID of the workflow to deploy'
          },
          environments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target environments to deploy to'
          },
          activate: {
            type: 'boolean',
            description: 'Whether to activate the workflow after deployment',
            default: false
          },
          force: {
            type: 'boolean',
            description: 'Whether to force deployment even if validation fails',
            default: false
          }
        },
        required: ['workflowId', 'environments']
      }
    },
    {
      name: 'n8n/validate_workflow',
      description: 'Validate a workflow against common rules and best practices',
      input_schema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID of the workflow to validate'
          },
          validationRules: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific validation rules to apply'
          }
        },
        required: ['workflowId']
      }
    },
    {
      name: 'n8n/manage_credentials',
      description: 'Manage credentials for n8n workflows',
      input_schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'check', 'create', 'update', 'delete'],
            description: 'Action to perform on credentials'
          },
          workflowId: {
            type: 'string',
            description: 'Workflow ID to check credentials for (required for "check" action)'
          },
          credentialType: {
            type: 'string',
            description: 'Type of credential to manage (required for "create" and "update" actions)'
          },
          credentialName: {
            type: 'string',
            description: 'Name of credential to manage (required for "create", "update", and "delete" actions)'
          },
          credentialData: {
            type: 'object',
            description: 'Credential data for create or update actions'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'n8n/generate_environment_config',
      description: 'Generate configuration files for n8n environments',
      input_schema: {
        type: 'object',
        properties: {
          environmentName: {
            type: 'string',
            description: 'Name of the environment'
          },
          description: {
            type: 'string',
            description: 'Description of the environment'
          },
          baseUrl: {
            type: 'string',
            description: 'Base URL of the n8n instance'
          },
          apiKey: {
            type: 'string',
            description: 'API key for the n8n instance'
          },
          settings: {
            type: 'object',
            description: 'Additional settings for the environment'
          }
        },
        required: ['environmentName']
      }
    }
  ]
};

// Helper function to convert ExecuteParams to MCPRequest
function adaptExecuteParamsToMCPRequest(params: ExecuteParams): any {
  return {
    body: params.input,
    toolName: params.tool
  };
}

// Execute function to route requests to the appropriate tool
async function execute(params: ExecuteParams): Promise<ExecuteResult> {
  try {
    const { input, tool } = params;
    
    // Route to the appropriate tool handler based on the tool name
    switch (tool) {
      // Workflow Management Tools
      case 'n8n/list_workflows':
        return await listWorkflows(input);
      case 'n8n/get_workflow':
        return await getWorkflow(input);
      case 'n8n/create_workflow':
        return await createWorkflow(input);
      case 'n8n/activate_workflow':
        return await activateWorkflow(input);
      case 'n8n/delete_workflow':
        return await deleteWorkflow(input);
      
      // Workflow Development Tools
      case 'n8n/create_research_workflow':
        return await createResearchWorkflow(input);
      case 'n8n/create_social_post_workflow':
        return await createSocialPostWorkflow(input);
      case 'n8n/generate_node':
        return await generateNode(input);
      
      // Debugging Tools
      case 'n8n/run_workflow':
        return await runWorkflow(input);
      case 'n8n/get_execution_logs':
        return await getExecutionLogs(input);
      case 'n8n/fix_workflow_error':
        return await fixWorkflowError(input);
      
      // Template Tools
      case 'n8n/list_templates':
        return await listTemplates(input);
      case 'n8n/apply_template':
        return await applyTemplate(input);
      
      // New Workflow Generation Assistant
      case 'n8n/generate_workflow':
        return await generateWorkflow(params);
      
      // Smart Debugger
      case 'n8n/analyze_error':
        return await analyzeWorkflowError(params);
      
      // Expression Builder
      case 'n8n/build_expression':
        return await expressionBuilderTool.handler(adaptExecuteParamsToMCPRequest(params));
      
      // Workflow-as-Code Converter
      case 'n8n/convert_workflow':
        return await convertWorkflowTool.handler(adaptExecuteParamsToMCPRequest(params));
      
      // Common Infrastructure Tools
      case 'n8n/deploy_workflow':
      case 'n8n/validate_workflow':
      case 'n8n/manage_credentials':
      case 'n8n/generate_environment_config':
        // Find the matching tool from the commonInfrastructureTools array
        const infrastructureTool = commonInfrastructureTools.find(t => 
          t.name === tool.replace('n8n/', '')
        );
        
        if (infrastructureTool) {
          return await infrastructureTool.handler(adaptExecuteParamsToMCPRequest(params));
        }
        
        return {
          error: {
            message: `Infrastructure tool not found: ${tool}`
          }
        };
      
      default:
        return {
          error: {
            message: `Unknown tool: ${tool}`
          }
        };
    }
  } catch (error: any) {
    console.error('Error executing tool:', error);
    return {
      error: {
        message: error.message || 'An unknown error occurred',
        stack: error.stack
      }
    };
  }
}

// Validate that the transport value is one of the allowed types
const validTransports = ['stdio', 'http', 'sse'] as const;
type ValidTransport = typeof validTransports[number];

function isValidTransport(transport: string): transport is ValidTransport {
  return (validTransports as readonly string[]).includes(transport);
}

// Get the transport value from environment or default to stdio
const transportEnv = process.env.MCP_SERVER_TRANSPORT || 'stdio';
const transport = isValidTransport(transportEnv) ? transportEnv : 'stdio';

// Create and start the MCP server
const server = createServer({ 
  manifest,
  execute,
  transport
});

// Start the server
const port = parseInt(process.env.MCP_SERVER_PORT || '3000');
server.listen({ port });

console.log(`n8n MCP server started with ${transport} transport${
  transport !== 'stdio' ? ` on port ${port}` : ''
}`);

// Export the server instance for testing or programmatic usage
export { server, manifest, execute }; 