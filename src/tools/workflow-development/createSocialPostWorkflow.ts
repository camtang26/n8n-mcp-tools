import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';
import { N8nConnections } from '../../schemas/n8nSchemas';

interface CreateSocialPostWorkflowInput {
  name: string;
  platforms: string[];
  content_source?: string;
}

/**
 * Create a social media posting workflow
 */
export async function createSocialPostWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { name, platforms = [], content_source = 'manual' } = input as CreateSocialPostWorkflowInput;
    
    if (!name) {
      return {
        error: {
          message: 'Workflow name is required'
        }
      };
    }
    
    if (platforms.length === 0) {
      return {
        error: {
          message: 'At least one social media platform is required'
        }
      };
    }
    
    // Create a social media posting workflow
    const workflowData = {
      name,
      nodes: [
        {
          parameters: {},
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [250, 300]
        }
      ],
      connections: {} as N8nConnections,
      active: false,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      },
      tags: ['social', ...platforms],
      description: `Social media posting workflow for ${platforms.join(', ')}`
    };
    
    // Add platform-specific nodes
    let lastNodeName = 'Start';
    let xPosition = 450;
    
    // Add content source node
    const contentSourceNode = {
      parameters: {},
      name: 'Content Source',
      type: content_source === 'rss' ? 'n8n-nodes-base.rssFeedRead' : 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [xPosition, 300]
    };
    
    // If content source is manual, configure Set node for manual input
    if (content_source === 'manual') {
      contentSourceNode.parameters = {
        values: {
          string: [
            {
              name: 'postContent',
              value: ''
            },
            {
              name: 'postTitle',
              value: ''
            },
            {
              name: 'postImage',
              value: ''
            }
          ]
        }
      };
    }
    
    workflowData.nodes.push(contentSourceNode);
    
    // Initialize connections structure if it doesn't exist
    if (!workflowData.connections.main) {
      workflowData.connections.main = {};
    }
    
    // Add connection from Start to Content Source
    workflowData.connections.main['Start'] = {
      main: [
        {
          node: 'Content Source',
          type: 'main',
          index: 0
        }
      ]
    };
    
    lastNodeName = 'Content Source';
    xPosition += 200;
    
    // Add a node for each platform
    for (const platform of platforms) {
      let platformNode: any = {
        name: `Post to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        position: [xPosition, 300],
        typeVersion: 1
      };
      
      // Configure based on platform
      switch (platform.toLowerCase()) {
        case 'twitter':
        case 'x':
          platformNode.type = 'n8n-nodes-base.twitter';
          platformNode.parameters = {
            text: '={{ $json.postContent }}',
            operation: 'create'
          };
          break;
          
        case 'linkedin':
          platformNode.type = 'n8n-nodes-base.linkedIn';
          platformNode.parameters = {
            text: '={{ $json.postContent }}',
            operation: 'create'
          };
          break;
          
        case 'facebook':
          platformNode.type = 'n8n-nodes-base.facebookGraphApi';
          platformNode.parameters = {
            message: '={{ $json.postContent }}',
            operation: 'create'
          };
          break;
          
        default:
          // Generic HTTP node for other platforms
          platformNode.type = 'n8n-nodes-base.httpRequest';
          platformNode.parameters = {
            url: `https://api.example.com/${platform}/post`,
            method: 'POST',
            body: {
              content: '={{ $json.postContent }}',
              title: '={{ $json.postTitle }}'
            },
            bodyContentType: 'json'
          };
      }
      
      workflowData.nodes.push(platformNode);
      
      // Add connection from previous node
      if (!workflowData.connections.main[lastNodeName]) {
        workflowData.connections.main[lastNodeName] = {
          main: []
        };
      }
      
      workflowData.connections.main[lastNodeName].main.push({
        node: platformNode.name,
        type: 'main',
        index: 0
      });
      
      lastNodeName = platformNode.name;
      xPosition += 200;
    }
    
    // Call the n8n API to create the workflow
    const workflow = await n8nApi.createWorkflow(workflowData);
    
    return {
      data: {
        workflow,
        message: `Social media posting workflow for ${platforms.join(', ')} created successfully`
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to create social post workflow: ${error.message}`
      }
    };
  }
} 