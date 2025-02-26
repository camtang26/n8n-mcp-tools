/**
 * Workflow Templates for the Workflow Generator
 * 
 * This file contains common workflow templates to use as starting points
 * for generating workflows based on natural language descriptions.
 */

import { N8nWorkflow, N8nNode, N8nConnections, N8nConnection, Position } from '../../schemas/n8nSchemas';
import { nodeDefinitions, createNode, createNodeId } from './nodeDefinitions';

/**
 * Interface for template workflow metadata
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string[];
  generateWorkflow: (params: WorkflowTemplateParams) => N8nWorkflow;
}

/**
 * Parameters for generating a workflow from a template
 */
export interface WorkflowTemplateParams {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

/**
 * Creates connections between nodes
 */
export function createConnections(sourceNodeName: string, targetNodeName: string): N8nConnection {
  return {
    node: targetNodeName,
    type: 'main',
    index: 0
  };
}

/**
 * Basic Web API Request Template
 * Fetches data from an API and processes it
 */
const apiRequestTemplate: WorkflowTemplate = {
  id: 'api-request',
  name: 'API Request Workflow',
  description: 'Fetch data from an API and process the results',
  category: ['api', 'data'],
  generateWorkflow: (params: WorkflowTemplateParams): N8nWorkflow => {
    const { name, description, parameters = {} } = params;
    const { apiUrl = 'https://api.example.com/data', method = 'GET' } = parameters;

    // Create nodes
    const startNode = createNode(
      nodeDefinitions['n8n-nodes-base.start'],
      createNodeId('start', 1),
      [250, 300] as Position
    );

    const httpNode = createNode(
      nodeDefinitions['n8n-nodes-base.httpRequest'],
      createNodeId('httpRequest', 1),
      [450, 300] as Position,
      {
        url: apiUrl,
        method: method
      },
      'API Request'
    );

    const setNode = createNode(
      nodeDefinitions['n8n-nodes-base.set'],
      createNodeId('set', 1),
      [650, 300] as Position,
      {
        values: {
          string: [
            {
              name: 'processedData',
              value: '={{ $json }}'
            }
          ]
        }
      },
      'Process Data'
    );

    // Create connections
    const connections: N8nConnections = {
      main: {}
    };
    
    connections.main[startNode.name] = {
      main: [createConnections(startNode.name, httpNode.name)]
    };
    
    connections.main[httpNode.name] = {
      main: [createConnections(httpNode.name, setNode.name)]
    };

    return {
      name: name,
      description: description || 'Workflow to fetch and process API data',
      nodes: [startNode, httpNode, setNode],
      connections: connections,
      active: false,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };
  }
};

/**
 * Social Media Monitoring Template
 * Monitors social media platforms and collects data
 */
const socialMediaTemplate: WorkflowTemplate = {
  id: 'social-media-monitoring',
  name: 'Social Media Monitoring',
  description: 'Monitor social media platforms for keywords or topics',
  category: ['social-media', 'monitoring'],
  generateWorkflow: (params: WorkflowTemplateParams): N8nWorkflow => {
    const { name, description, parameters = {} } = params;
    const { 
      platforms = ['twitter'], 
      keywords = ['n8n', 'workflow automation'],
      schedule = '0 */2 * * *' // Every 2 hours
    } = parameters;

    // Create nodes
    const scheduleNode = createNode(
      nodeDefinitions['n8n-nodes-base.scheduleTrigger'],
      createNodeId('scheduleTrigger', 1),
      [250, 300] as Position,
      {
        interval: [{
          field: 'cronExpression',
          expression: schedule
        }]
      }
    );

    const nodes: N8nNode[] = [scheduleNode];
    const connections: N8nConnections = { main: {} };
    
    let lastNodeName = scheduleNode.name;
    let nodePosition: Position = [450, 300] as Position;

    // Add nodes for each platform
    platforms.forEach((platform, index) => {
      let platformNode;
      
      if (platform.toLowerCase() === 'twitter') {
        platformNode = createNode(
          nodeDefinitions['n8n-nodes-base.twitter'],
          createNodeId('twitter', index + 1),
          nodePosition as Position,
          {
            operation: 'search',
            searchText: keywords.join(' OR '),
            options: {
              limit: 10,
              includeReplies: false
            }
          },
          'Twitter Search'
        );
      } else if (platform.toLowerCase() === 'reddit') {
        platformNode = createNode(
          nodeDefinitions['n8n-nodes-base.reddit'],
          createNodeId('reddit', index + 1),
          nodePosition as Position,
          {
            operation: 'search',
            subreddit: 'all',
            options: {
              limit: 10,
              query: keywords.join(' OR ')
            }
          },
          'Reddit Search'
        );
      }
      
      if (platformNode) {
        nodes.push(platformNode);
        
        // Connect this platform node to the previous node
        if (!connections.main[lastNodeName]) {
          connections.main[lastNodeName] = { main: [] };
        }
        
        connections.main[lastNodeName].main.push(
          createConnections(lastNodeName, platformNode.name)
        );
        
        lastNodeName = platformNode.name;
        nodePosition = [nodePosition[0] + 200, nodePosition[1]];
      }
    });
    
    // Add a function node to process the results
    const functionNode = createNode(
      nodeDefinitions['n8n-nodes-base.function'],
      createNodeId('function', 1),
      [nodePosition[0], nodePosition[1]],
      {
        functionCode: `
// Deduplicate and format the social media data
const results = [];
const seenIds = new Set();

for (const item of items) {
  let id, content, source, url, date;
  
  if (item.json.id_str) {
    // Twitter data
    id = item.json.id_str;
    content = item.json.text || item.json.full_text;
    source = 'Twitter';
    url = \`https://twitter.com/user/status/\${id}\`;
    date = item.json.created_at;
  } else if (item.json.id) {
    // Reddit data
    id = item.json.id;
    content = item.json.title || item.json.selftext;
    source = 'Reddit';
    url = item.json.url;
    date = new Date(item.json.created_utc * 1000).toISOString();
  }
  
  if (id && !seenIds.has(id)) {
    seenIds.add(id);
    results.push({
      id,
      content,
      source,
      url,
      date,
      keywords: ${JSON.stringify(keywords)}.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      )
    });
  }
}

return results.map(r => ({ json: r }));
`
      },
      'Process Social Data'
    );
    
    nodes.push(functionNode);
    
    if (!connections.main[lastNodeName]) {
      connections.main[lastNodeName] = { main: [] };
    }
    
    connections.main[lastNodeName].main.push(
      createConnections(lastNodeName, functionNode.name)
    );

    return {
      name: name,
      description: description || 'Workflow to monitor social media for keywords',
      nodes,
      connections,
      active: false,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };
  }
};

/**
 * Data Processing Pipeline Template
 * Process and transform data through multiple steps
 */
const dataProcessingTemplate: WorkflowTemplate = {
  id: 'data-processing',
  name: 'Data Processing Pipeline',
  description: 'Multi-step data processing workflow with transformations',
  category: ['data', 'processing'],
  generateWorkflow: (params: WorkflowTemplateParams): N8nWorkflow => {
    const { name, description, parameters = {} } = params;
    const { 
      sourceType = 'http',
      sourceConfig = { url: 'https://api.example.com/data' },
      transformations = ['filter', 'format']
    } = parameters;

    // Create nodes
    const startNode = createNode(
      nodeDefinitions['n8n-nodes-base.start'],
      createNodeId('start', 1),
      [250, 300] as Position
    );

    const nodes: N8nNode[] = [startNode];
    const connections: N8nConnections = { main: {} };
    
    let lastNodeName = startNode.name;
    let nodePosition: Position = [450, 300] as Position;

    // Source node based on type
    let sourceNode;
    if (sourceType === 'http') {
      sourceNode = createNode(
        nodeDefinitions['n8n-nodes-base.httpRequest'],
        createNodeId('httpRequest', 1),
        nodePosition as Position,
        {
          url: sourceConfig.url || 'https://api.example.com/data',
          method: sourceConfig.method || 'GET'
        },
        'Data Source'
      );
    } else if (sourceType === 'googleSheets') {
      sourceNode = createNode(
        nodeDefinitions['n8n-nodes-base.googleSheets'],
        createNodeId('googleSheets', 1),
        nodePosition as Position,
        {
          operation: 'read',
          sheetId: sourceConfig.sheetId || '',
          range: sourceConfig.range || 'A:Z'
        },
        'Google Sheets Source'
      );
    }
    
    if (sourceNode) {
      nodes.push(sourceNode);
      
      if (!connections.main[lastNodeName]) {
        connections.main[lastNodeName] = { main: [] };
      }
      
      connections.main[lastNodeName].main.push(
        createConnections(lastNodeName, sourceNode.name)
      );
      
      lastNodeName = sourceNode.name;
      nodePosition = [nodePosition[0] + 200, nodePosition[1]];
    }

    // Add transformation nodes
    transformations.forEach((transformation, index) => {
      let transformNode;
      
      if (transformation === 'filter') {
        transformNode = createNode(
          nodeDefinitions['n8n-nodes-base.function'],
          createNodeId('function', index + 1),
          nodePosition,
          {
            functionCode: `
// Filter data example
return items.filter(item => {
  // Add your filtering logic here
  // Example: only keep items with a specific property
  return item.json.status === 'active';
});`
          },
          'Filter Data'
        );
      } else if (transformation === 'format') {
        transformNode = createNode(
          nodeDefinitions['n8n-nodes-base.set'],
          createNodeId('set', index + 1),
          nodePosition,
          {
            values: {
              string: [
                {
                  name: 'formattedData',
                  value: '={{ $json }}'
                }
              ]
            }
          },
          'Format Data'
        );
      } else if (transformation === 'merge') {
        // This would require a more complex setup with multiple inputs
        transformNode = createNode(
          nodeDefinitions['n8n-nodes-base.function'],
          createNodeId('function', index + 1),
          nodePosition,
          {
            functionCode: `
// Merge or combine data example
// For a real merge, you'd need multiple inputs to the node
return items.map(item => {
  // Transform the data as needed
  return {
    json: {
      ...item.json,
      merged: true,
      timestamp: new Date().toISOString()
    }
  };
});`
          },
          'Transform Data'
        );
      }
      
      if (transformNode) {
        nodes.push(transformNode);
        
        if (!connections.main[lastNodeName]) {
          connections.main[lastNodeName] = { main: [] };
        }
        
        connections.main[lastNodeName].main.push(
          createConnections(lastNodeName, transformNode.name)
        );
        
        lastNodeName = transformNode.name;
        nodePosition = [nodePosition[0] + 200, nodePosition[1]];
      }
    });

    return {
      name: name,
      description: description || 'Data processing workflow with multiple transformations',
      nodes,
      connections,
      active: false,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };
  }
};

/**
 * Notification Workflow Template
 * Sends notifications based on events or triggers
 */
const notificationTemplate: WorkflowTemplate = {
  id: 'notification',
  name: 'Notification Workflow',
  description: 'Send notifications when specific events occur',
  category: ['notification', 'alerts'],
  generateWorkflow: (params: WorkflowTemplateParams): N8nWorkflow => {
    const { name, description, parameters = {} } = params;
    const { 
      trigger = 'schedule',
      triggerConfig = { schedule: '0 9 * * *' }, // Daily at 9 AM
      notificationChannels = ['email'],
      notificationConfig = {
        email: { to: 'user@example.com', subject: 'Notification' }
      }
    } = parameters;

    // Create nodes
    const nodes: N8nNode[] = [];
    const connections: N8nConnections = { main: {} };
    
    // Trigger node
    let triggerNode;
    if (trigger === 'schedule') {
      triggerNode = createNode(
        nodeDefinitions['n8n-nodes-base.scheduleTrigger'],
        createNodeId('scheduleTrigger', 1),
        [250, 300] as Position,
        {
          interval: [{
            field: 'cronExpression',
            expression: triggerConfig.schedule || '0 9 * * *'
          }]
        },
        'Schedule Trigger'
      );
    } else if (trigger === 'manual') {
      triggerNode = createNode(
        nodeDefinitions['n8n-nodes-base.manualTrigger'],
        createNodeId('manualTrigger', 1),
        [250, 300] as Position,
        {},
        'Manual Trigger'
      );
    }
    
    if (triggerNode) {
      nodes.push(triggerNode);
    }
    
    let lastNodeName = triggerNode.name;
    let nodePosition: Position = [450, 300] as Position;

    // Add a Set node to prepare notification data
    const setNode = createNode(
      nodeDefinitions['n8n-nodes-base.set'],
      createNodeId('set', 1),
      nodePosition,
      {
        values: {
          string: [
            {
              name: 'notificationTitle',
              value: notificationConfig.email?.subject || 'Notification'
            },
            {
              name: 'notificationBody',
              value: notificationConfig.email?.body || 'This is an automated notification from n8n.'
            },
            {
              name: 'timestamp',
              value: '={{ $now }}'
            }
          ]
        }
      },
      'Prepare Notification'
    );
    
    nodes.push(setNode);
    
    if (!connections.main[lastNodeName]) {
      connections.main[lastNodeName] = { main: [] };
    }
    
    connections.main[lastNodeName].main.push(
      createConnections(lastNodeName, setNode.name)
    );
    
    lastNodeName = setNode.name;
    nodePosition = [nodePosition[0] + 200, nodePosition[1]];

    // Add notification channel nodes
    notificationChannels.forEach((channel, index) => {
      let channelNode;
      
      if (channel === 'email') {
        channelNode = createNode(
          nodeDefinitions['n8n-nodes-base.email'],
          createNodeId('email', index + 1),
          [nodePosition[0], nodePosition[1] + (index * 150)] as Position,
          {
            fromEmail: notificationConfig.email?.from || 'notifications@example.com',
            toEmail: notificationConfig.email?.to || 'user@example.com',
            subject: '={{ $json.notificationTitle }}',
            text: '={{ $json.notificationBody }}'
          },
          'Send Email'
        );
      } else if (channel === 'slack') {
        channelNode = createNode(
          nodeDefinitions['n8n-nodes-base.slack'],
          createNodeId('slack', index + 1),
          [nodePosition[0], nodePosition[1] + (index * 150)] as Position,
          {
            operation: 'sendMessage',
            channel: notificationConfig.slack?.channel || 'general',
            text: '={{ $json.notificationTitle + "\\n\\n" + $json.notificationBody }}'
          },
          'Send Slack Message'
        );
      }
      
      if (channelNode) {
        nodes.push(channelNode);
        
        if (!connections.main[lastNodeName]) {
          connections.main[lastNodeName] = { main: [] };
        }
        
        connections.main[lastNodeName].main.push(
          createConnections(lastNodeName, channelNode.name)
        );
      }
    });

    return {
      name: name,
      description: description || 'Workflow to send notifications',
      nodes,
      connections,
      active: false,
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };
  }
};

/**
 * Export all templates
 */
export const workflowTemplates: Record<string, WorkflowTemplate> = {
  'api-request': apiRequestTemplate,
  'social-media-monitoring': socialMediaTemplate,
  'data-processing': dataProcessingTemplate,
  'notification': notificationTemplate
}; 