/**
 * Common Infrastructure Utilities for n8n
 * 
 * This module provides tools for managing n8n environments, credentials,
 * deployment, and common infrastructure tasks.
 */

import { MCPRequest, MCPResponse, MCP } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Input for deploying a workflow to multiple environments
 */
interface DeployWorkflowInput {
  /** ID of the workflow to deploy */
  workflowId: string;
  /** Target environments to deploy to */
  environments: string[];
  /** Whether to activate the workflow after deployment */
  activate?: boolean;
  /** Whether to force deployment even if validation fails */
  force?: boolean;
}

/**
 * Input for validating a workflow
 */
interface ValidateWorkflowInput {
  /** ID of the workflow to validate */
  workflowId: string;
  /** Specific validation rules to apply */
  validationRules?: string[];
}

/**
 * Input for managing workflow credentials
 */
interface ManageCredentialsInput {
  /** Action to perform on credentials */
  action: 'list' | 'check' | 'create' | 'update' | 'delete';
  /** Workflow ID to check credentials for (optional) */
  workflowId?: string;
  /** Type of credential to manage */
  credentialType?: string;
  /** Name of credential to manage */
  credentialName?: string;
  /** Credential data for create or update actions */
  credentialData?: Record<string, any>;
}

/**
 * Input for generating an environment configuration
 */
interface GenerateEnvironmentConfigInput {
  /** Name of the environment */
  environmentName: string;
  /** Description of the environment */
  description?: string;
  /** Base URL of the n8n instance */
  baseUrl?: string;
  /** API key for the n8n instance */
  apiKey?: string;
  /** Additional settings for the environment */
  settings?: Record<string, any>;
}

/**
 * Deploy a workflow to multiple environments
 */
async function deployWorkflow(input: DeployWorkflowInput): Promise<MCPResponse> {
  try {
    const { workflowId, environments, activate = false, force = false } = input;
    
    if (!workflowId) {
      return {
        error: {
          message: 'Workflow ID is required for deployment'
        }
      };
    }
    
    if (!environments || environments.length === 0) {
      return {
        error: {
          message: 'At least one target environment is required for deployment'
        }
      };
    }
    
    // Validate environments
    const availableEnvironments = await getEnvironments();
    const invalidEnvironments = environments.filter(
      env => !availableEnvironments.includes(env)
    );
    
    if (invalidEnvironments.length > 0 && !force) {
      return {
        error: {
          message: `Invalid environment(s): ${invalidEnvironments.join(', ')}`,
          details: {
            availableEnvironments
          }
        }
      };
    }
    
    // Get the workflow to deploy
    let workflow;
    try {
      workflow = await n8nApi.getWorkflow(workflowId);
    } catch (error: any) {
      return {
        error: {
          message: `Failed to retrieve workflow ${workflowId}: ${error.message}`
        }
      };
    }
    
    // Validate the workflow before deployment if not forcing
    if (!force) {
      const validationResult = await validateWorkflow({
        workflowId
      });
      
      if (validationResult.error) {
        return {
          error: {
            message: 'Validation failed, deployment aborted',
            details: validationResult.error
          }
        };
      }
    }
    
    // Simulate deployment to environments
    const deploymentResults = environments.map(env => {
      // In a real implementation, this would use different API instances
      // for each environment and perform the actual deployment
      return {
        environment: env,
        success: true,
        message: `Workflow ${workflow.name} deployed to ${env}`,
        workflowId: `${env}-${workflowId}`, // Simulated different ID per environment
        activationStatus: activate
      };
    });
    
    return {
      body: {
        message: `Workflow deployed to ${environments.length} environment(s)`,
        deployments: deploymentResults
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Deployment failed: ${error.message}`
      }
    };
  }
}

/**
 * Validate a workflow against common rules and best practices
 */
async function validateWorkflow(input: ValidateWorkflowInput): Promise<MCPResponse> {
  try {
    const { workflowId, validationRules = ['all'] } = input;
    
    if (!workflowId) {
      return {
        error: {
          message: 'Workflow ID is required for validation'
        }
      };
    }
    
    // Get the workflow to validate
    let workflow;
    try {
      workflow = await n8nApi.getWorkflow(workflowId);
    } catch (error: any) {
      return {
        error: {
          message: `Failed to retrieve workflow ${workflowId}: ${error.message}`
        }
      };
    }
    
    // Validation rules to apply
    const rules: Record<string, (wf: any) => { pass: boolean; issues: string[] }> = {
      'trigger': (wf) => {
        const hasTrigger = wf.nodes.some((node: any) => 
          node.type.includes('Trigger') || node.type === 'n8n-nodes-base.start'
        );
        return {
          pass: hasTrigger,
          issues: hasTrigger ? [] : ['Workflow must have at least one trigger node']
        };
      },
      'errorHandling': (wf) => {
        const hasErrorHandling = wf.settings?.errorWorkflow || 
          wf.nodes.some((node: any) => node.continueOnFail === true);
        return {
          pass: hasErrorHandling,
          issues: hasErrorHandling ? [] : ['Workflow lacks error handling mechanisms']
        };
      },
      'naming': (wf) => {
        const issues: string[] = [];
        if (!wf.name || wf.name.length < 3) {
          issues.push('Workflow name is too short or missing');
        }
        
        const uniqueNodeNames = new Set();
        wf.nodes.forEach((node: any) => {
          if (uniqueNodeNames.has(node.name)) {
            issues.push(`Duplicate node name: ${node.name}`);
          }
          uniqueNodeNames.add(node.name);
          
          if (node.name === node.type || node.name.includes('Node')) {
            issues.push(`Generic node name detected: ${node.name}`);
          }
        });
        
        return {
          pass: issues.length === 0,
          issues
        };
      },
      'credentials': (wf) => {
        const issues: string[] = [];
        const nodesWithCredentials = wf.nodes.filter((node: any) => 
          node.credentials && Object.keys(node.credentials).length > 0
        );
        
        if (nodesWithCredentials.length > 0) {
          // In a real implementation, this would check if the credentials exist
          // and are valid for the current environment
          issues.push('Workflow uses credentials that should be verified');
        }
        
        return {
          pass: issues.length === 0,
          issues
        };
      }
    };
    
    // Apply the selected validation rules
    const results: Record<string, { pass: boolean; issues: string[] }> = {};
    
    if (validationRules.includes('all')) {
      // Apply all rules
      for (const [ruleName, ruleFunc] of Object.entries(rules)) {
        results[ruleName] = ruleFunc(workflow);
      }
    } else {
      // Apply only selected rules
      for (const rule of validationRules) {
        if (rules[rule]) {
          results[rule] = rules[rule](workflow);
        }
      }
    }
    
    // Collect all issues
    const allIssues: string[] = [];
    let allPassed = true;
    
    for (const [ruleName, result] of Object.entries(results)) {
      if (!result.pass) {
        allPassed = false;
        allIssues.push(...result.issues.map(issue => `[${ruleName}] ${issue}`));
      }
    }
    
    return {
      body: {
        workflowId,
        workflowName: workflow.name,
        validationPassed: allPassed,
        ruleResults: results,
        issues: allIssues
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Validation failed: ${error.message}`
      }
    };
  }
}

/**
 * Manage workflow credentials
 */
async function manageCredentials(input: ManageCredentialsInput): Promise<MCPResponse> {
  try {
    const { action, workflowId, credentialType, credentialName, credentialData } = input;
    
    if (!action) {
      return {
        error: {
          message: 'Credential action is required'
        }
      };
    }
    
    switch (action) {
      case 'list':
        // In a real implementation, this would call the n8n API to list credentials
        return {
          body: {
            credentials: [
              { id: 'cred1', name: 'AWS Credentials', type: 'aws' },
              { id: 'cred2', name: 'Gmail API', type: 'google' },
              { id: 'cred3', name: 'Slack Bot', type: 'slack' }
            ]
          }
        };
        
      case 'check':
        if (!workflowId) {
          return {
            error: {
              message: 'Workflow ID is required to check credentials'
            }
          };
        }
        
        // Get the workflow to check credentials
        let workflow;
        try {
          workflow = await n8nApi.getWorkflow(workflowId);
        } catch (error: any) {
          return {
            error: {
              message: `Failed to retrieve workflow ${workflowId}: ${error.message}`
            }
          };
        }
        
        // Check credentials used in the workflow
        const credentialsUsed: Array<{ nodeId: string; nodeName: string; credentialType: string; credentialName?: string }> = [];
        
        workflow.nodes.forEach((node: any) => {
          if (node.credentials) {
            for (const [type, cred] of Object.entries(node.credentials)) {
              credentialsUsed.push({
                nodeId: node.id,
                nodeName: node.name,
                credentialType: type,
                credentialName: typeof cred === 'string' ? cred : (cred as any).name
              });
            }
          }
        });
        
        return {
          body: {
            workflowId,
            workflowName: workflow.name,
            credentialsUsed,
            totalCredentials: credentialsUsed.length
          }
        };
        
      case 'create':
      case 'update':
        if (!credentialType || !credentialName) {
          return {
            error: {
              message: 'Credential type and name are required for creation/update'
            }
          };
        }
        
        if (!credentialData) {
          return {
            error: {
              message: 'Credential data is required for creation/update'
            }
          };
        }
        
        // In a real implementation, this would call the n8n API to create/update credentials
        return {
          body: {
            message: `Credential ${credentialName} ${action === 'create' ? 'created' : 'updated'} successfully`,
            credentialType,
            credentialName
          }
        };
        
      case 'delete':
        if (!credentialName) {
          return {
            error: {
              message: 'Credential name is required for deletion'
            }
          };
        }
        
        // In a real implementation, this would call the n8n API to delete credentials
        return {
          body: {
            message: `Credential ${credentialName} deleted successfully`,
            credentialName
          }
        };
        
      default:
        return {
          error: {
            message: `Invalid credential action: ${action}`
          }
        };
    }
  } catch (error: any) {
    return {
      error: {
        message: `Credential management failed: ${error.message}`
      }
    };
  }
}

/**
 * Generate an environment configuration file for n8n
 */
async function generateEnvironmentConfig(input: GenerateEnvironmentConfigInput): Promise<MCPResponse> {
  try {
    const { 
      environmentName, 
      description = 'n8n environment configuration', 
      baseUrl = 'http://localhost:5678',
      apiKey = 'replace_with_actual_api_key',
      settings = {}
    } = input;
    
    if (!environmentName) {
      return {
        error: {
          message: 'Environment name is required'
        }
      };
    }
    
    // Generate environment configuration
    const config = {
      name: environmentName,
      description,
      n8n: {
        baseUrl,
        apiKey,
        apiPath: '/api/v1'
      },
      settings: {
        timezone: 'UTC',
        executionTimeout: 3600,
        maxExecutionTimeout: 7200,
        saveExecutionProgress: true,
        saveManualExecutions: true,
        ...settings
      },
      created: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // Generate environment variables file content
    const envFileContent = `# n8n Environment Configuration: ${environmentName}
# Generated by n8n-mcp-tools
# ${new Date().toISOString()}

N8N_API_URL=${baseUrl}/api/v1
N8N_API_KEY=${apiKey}
N8N_ENVIRONMENT=${environmentName}

# Execution Settings
N8N_EXECUTION_TIMEOUT=${config.settings.executionTimeout}
N8N_SAVE_EXECUTION_PROGRESS=${config.settings.saveExecutionProgress}

# Additional Settings
TIMEZONE=${config.settings.timezone}
${Object.entries(settings)
  .map(([key, value]) => `${key.toUpperCase()}=${value}`)
  .join('\n')}
`;
    
    // In a real implementation, this would save the files to disk
    // Here we just return the generated content
    return {
      body: {
        message: `Environment configuration generated for ${environmentName}`,
        configFile: config,
        envFile: envFileContent,
        instructions: [
          `1. Save the configuration to 'n8n-${environmentName.toLowerCase()}.json'`,
          `2. Save the environment variables to '.env.${environmentName.toLowerCase()}'`,
          `3. Use these files to configure your n8n instance and deployment tools`
        ]
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to generate environment configuration: ${error.message}`
      }
    };
  }
}

/**
 * Get available environments
 */
async function getEnvironments(): Promise<string[]> {
  // In a real implementation, this would scan for environment files
  // or query a configuration system
  return ['development', 'staging', 'production'];
}

/**
 * MCP Tool handler for the deployWorkflow function
 */
const deployWorkflowTool = {
  name: 'deployWorkflow',
  title: 'Deploy n8n Workflow',
  description: 'Deploy a workflow to one or more environments',
  schema: MCP.schema.object({
    workflowId: MCP.schema.string({
      description: 'ID of the workflow to deploy'
    }),
    environments: MCP.schema.array(MCP.schema.string({
      description: 'Target environments to deploy to'
    })),
    activate: MCP.schema.optional(MCP.schema.boolean({
      description: 'Whether to activate the workflow after deployment',
      default: false
    })),
    force: MCP.schema.optional(MCP.schema.boolean({
      description: 'Whether to force deployment even if validation fails',
      default: false
    }))
  }),
  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    return deployWorkflow(req.body as DeployWorkflowInput);
  }
};

/**
 * MCP Tool handler for the validateWorkflow function
 */
const validateWorkflowTool = {
  name: 'validateWorkflow',
  title: 'Validate n8n Workflow',
  description: 'Validate a workflow against common rules and best practices',
  schema: MCP.schema.object({
    workflowId: MCP.schema.string({
      description: 'ID of the workflow to validate'
    }),
    validationRules: MCP.schema.optional(MCP.schema.array(MCP.schema.string({
      description: 'Specific validation rules to apply'
    })))
  }),
  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    return validateWorkflow(req.body as ValidateWorkflowInput);
  }
};

/**
 * MCP Tool handler for the manageCredentials function
 */
const manageCredentialsTool = {
  name: 'manageCredentials',
  title: 'Manage n8n Credentials',
  description: 'Manage credentials for n8n workflows',
  schema: MCP.schema.object({
    action: MCP.schema.string({
      description: 'Action to perform on credentials',
      enum: ['list', 'check', 'create', 'update', 'delete']
    }),
    workflowId: MCP.schema.optional(MCP.schema.string({
      description: 'Workflow ID to check credentials for (required for "check" action)'
    })),
    credentialType: MCP.schema.optional(MCP.schema.string({
      description: 'Type of credential to manage (required for "create" and "update" actions)'
    })),
    credentialName: MCP.schema.optional(MCP.schema.string({
      description: 'Name of credential to manage (required for "create", "update", and "delete" actions)'
    })),
    credentialData: MCP.schema.optional(MCP.schema.object({
      description: 'Credential data for create or update actions'
    }))
  }),
  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    return manageCredentials(req.body as ManageCredentialsInput);
  }
};

/**
 * MCP Tool handler for the generateEnvironmentConfig function
 */
const generateEnvironmentConfigTool = {
  name: 'generateEnvironmentConfig',
  title: 'Generate Environment Configuration',
  description: 'Generate configuration files for n8n environments',
  schema: MCP.schema.object({
    environmentName: MCP.schema.string({
      description: 'Name of the environment'
    }),
    description: MCP.schema.optional(MCP.schema.string({
      description: 'Description of the environment'
    })),
    baseUrl: MCP.schema.optional(MCP.schema.string({
      description: 'Base URL of the n8n instance'
    })),
    apiKey: MCP.schema.optional(MCP.schema.string({
      description: 'API key for the n8n instance'
    })),
    settings: MCP.schema.optional(MCP.schema.object({
      description: 'Additional settings for the environment'
    }))
  }),
  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    return generateEnvironmentConfig(req.body as GenerateEnvironmentConfigInput);
  }
};

/**
 * Export all MCP tools
 */
export default [
  deployWorkflowTool,
  validateWorkflowTool,
  manageCredentialsTool,
  generateEnvironmentConfigTool
]; 