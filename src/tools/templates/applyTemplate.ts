import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi } from '../../api/n8nApi';
import { N8nConnections } from '../../schemas/n8nSchemas';

interface ApplyTemplateInput {
  template_id: string;
  name: string;
  parameters?: Record<string, any>;
}

/**
 * Apply a template to create a new workflow
 */
export async function applyTemplate(input: any): Promise<ExecuteResult> {
  try {
    const { template_id, name, parameters = {} } = input as ApplyTemplateInput;
    
    if (!template_id) {
      return {
        error: {
          message: 'Template ID is required'
        }
      };
    }
    
    if (!name) {
      return {
        error: {
          message: 'Workflow name is required'
        }
      };
    }
    
    // In a real implementation, this would get the template from the n8n API or a templates database
    // For now, we'll create sample workflow data based on the template ID
    
    let workflowData: any;
    
    switch (template_id) {
      case 'api-request':
        workflowData = createApiRequestWorkflow(name, parameters);
        break;
        
      case 'social-media':
        workflowData = createSocialMediaWorkflow(name, parameters);
        break;
        
      case 'data-processing':
        workflowData = createDataProcessingWorkflow(name, parameters);
        break;
        
      case 'notification':
        workflowData = createNotificationWorkflow(name, parameters);
        break;
        
      default:
        return {
          error: {
            message: `Template with ID "${template_id}" not found`
          }
        };
    }
    
    // Apply custom parameters to the workflow
    if (parameters) {
      // Apply general parameters
      if (parameters.description) {
        workflowData.description = parameters.description;
      }
      
      if (parameters.tags) {
        workflowData.tags = parameters.tags;
      }
      
      // Apply template-specific parameters
      // This would be a more complex logic in a real implementation
      // depending on the template structure
    }
    
    // Call the n8n API to create the workflow
    const workflow = await n8nApi.createWorkflow(workflowData);
    
    return {
      data: {
        workflow,
        template_id,
        message: `Workflow "${name}" created from template "${template_id}"`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to apply template: ${error.message}`
      }
    };
  }
}

/**
 * Create a workflow from the API Request template
 */
function createApiRequestWorkflow(name: string, parameters: Record<string, any>): any {
  const apiUrl = parameters.apiUrl || 'https://api.example.com/data';
  const method = parameters.method || 'GET';
  
  return {
    name,
    description: 'Workflow created from the API Request template',
    nodes: [
      {
        parameters: {},
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          url: apiUrl,
          method,
          authentication: 'none',
          options: {}
        },
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          values: {
            string: [
              {
                name: 'processedData',
                value: '={{ $json }}'
              }
            ]
          }
        },
        name: 'Process Data',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [650, 300]
      }
    ],
    connections: {
      main: {
        'Start': {
          main: [
            {
              node: 'HTTP Request',
              type: 'main',
              index: 0
            }
          ]
        },
        'HTTP Request': {
          main: [
            {
              node: 'Process Data',
              type: 'main',
              index: 0
            }
          ]
        }
      }
    },
    active: false,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true
    },
    tags: ['api', 'template']
  };
}

/**
 * Create a workflow from the Social Media template
 */
function createSocialMediaWorkflow(name: string, parameters: Record<string, any>): any {
  const platforms = parameters.platforms || ['twitter'];
  
  return {
    name,
    description: 'Workflow created from the Social Media Posting template',
    nodes: [
      {
        parameters: {},
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          values: {
            string: [
              {
                name: 'postContent',
                value: 'Sample post content'
              },
              {
                name: 'postTitle',
                value: 'Sample post title'
              }
            ]
          }
        },
        name: 'Create Post Content',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [450, 300]
      }
    ],
    connections: {
      main: {
        'Start': {
          main: [
            {
              node: 'Create Post Content',
              type: 'main',
              index: 0
            }
          ]
        }
      }
    },
    active: false,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true
    },
    tags: ['social', 'marketing', 'template']
  };
}

/**
 * Create a workflow from the Data Processing template
 */
function createDataProcessingWorkflow(name: string, parameters: Record<string, any>): any {
  return {
    name,
    description: 'Workflow created from the Data Processing Pipeline template',
    nodes: [
      {
        parameters: {},
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          url: 'https://api.example.com/data',
          method: 'GET',
          authentication: 'none',
          options: {}
        },
        name: 'Data Source',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          functionCode: '// Process the data from the previous node\nreturn items;'
        },
        name: 'Transform Data',
        type: 'n8n-nodes-base.function',
        typeVersion: 1,
        position: [650, 300]
      },
      {
        parameters: {
          values: {
            string: [
              {
                name: 'processedData',
                value: '={{ $json }}'
              }
            ]
          }
        },
        name: 'Format Data',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [850, 300]
      }
    ],
    connections: {
      main: {
        'Start': {
          main: [
            {
              node: 'Data Source',
              type: 'main',
              index: 0
            }
          ]
        },
        'Data Source': {
          main: [
            {
              node: 'Transform Data',
              type: 'main',
              index: 0
            }
          ]
        },
        'Transform Data': {
          main: [
            {
              node: 'Format Data',
              type: 'main',
              index: 0
            }
          ]
        }
      }
    },
    active: false,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true
    },
    tags: ['data', 'transformation', 'template']
  };
}

/**
 * Create a workflow from the Notification template
 */
function createNotificationWorkflow(name: string, parameters: Record<string, any>): any {
  return {
    name,
    description: 'Workflow created from the Notification System template',
    nodes: [
      {
        parameters: {},
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          values: {
            string: [
              {
                name: 'notificationTitle',
                value: 'Notification Title'
              },
              {
                name: 'notificationBody',
                value: 'Notification Body'
              }
            ]
          }
        },
        name: 'Prepare Notification',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [450, 300]
      },
      {
        parameters: {
          fromEmail: 'notifications@example.com',
          toEmail: parameters.email || 'user@example.com',
          subject: '={{ $json.notificationTitle }}',
          text: '={{ $json.notificationBody }}'
        },
        name: 'Send Email',
        type: 'n8n-nodes-base.email',
        typeVersion: 1,
        position: [650, 300]
      }
    ],
    connections: {
      main: {
        'Start': {
          main: [
            {
              node: 'Prepare Notification',
              type: 'main',
              index: 0
            }
          ]
        },
        'Prepare Notification': {
          main: [
            {
              node: 'Send Email',
              type: 'main',
              index: 0
            }
          ]
        }
      }
    },
    active: false,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true
    },
    tags: ['notification', 'email', 'template']
  };
} 