/**
 * Workflow Generation Tool
 * 
 * Generates n8n workflows from natural language descriptions
 */

// Use local type definitions instead of SDK imports
type ExecuteParams = {
  tool: string;
  input: any;
};

type ExecuteResult = {
  data?: any;
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
};

import { N8nWorkflow, N8nNode, N8nConnections } from '../../schemas/n8nSchemas';
import { n8nApi } from '../../api/n8nApi';
import { nodeDefinitions, createNode, createNodeId } from './nodeDefinitions';
import { workflowTemplates, WorkflowTemplateParams } from './templates';

interface WorkflowRequirements {
  name: string;
  description: string;
  operations: string[];
  dataTypes: string[];
  conditionalLogic: boolean;
  scheduling?: string;
  templateId?: string;
  complexity: 'simple' | 'medium' | 'complex';
}

interface WorkflowGenerationInput {
  description: string;
  requiredNodes?: string[];
  outputFormat?: 'json' | 'code';
  complexity?: 'simple' | 'medium' | 'complex';
  includeCredentials?: boolean;
}

/**
 * Parse natural language description to extract workflow requirements
 */
function parseWorkflowRequirements(description: string): WorkflowRequirements {
  // Default requirements
  let requirements: WorkflowRequirements = {
    name: 'Generated Workflow',
    description: description,
    operations: [],
    dataTypes: [],
    conditionalLogic: false,
    complexity: 'simple'
  };
  
  // Extract workflow name if it follows a common pattern
  const nameMatch = description.match(/workflow (?:to|that|which) ([\w\s]+)/i);
  if (nameMatch) {
    requirements.name = nameMatch[1].trim().charAt(0).toUpperCase() + nameMatch[1].trim().slice(1);
  }
  
  // Look for common operations
  const operationKeywords = [
    { keywords: ['fetch', 'get', 'retrieve', 'download', 'api'], operation: 'fetch' },
    { keywords: ['send', 'email', 'message', 'notification'], operation: 'notify' },
    { keywords: ['filter', 'process', 'transform', 'clean'], operation: 'process' },
    { keywords: ['schedule', 'recurring', 'every day', 'weekly', 'monthly'], operation: 'schedule' },
    { keywords: ['if', 'condition', 'when', 'case'], operation: 'condition' },
    { keywords: ['store', 'save', 'database', 'google sheets'], operation: 'store' }
  ];
  
  operationKeywords.forEach(opKeyword => {
    if (opKeyword.keywords.some(keyword => description.toLowerCase().includes(keyword))) {
      if (!requirements.operations.includes(opKeyword.operation)) {
        requirements.operations.push(opKeyword.operation);
      }
      
      // Set scheduling if found
      if (opKeyword.operation === 'schedule') {
        requirements.scheduling = 'daily'; // Default
        
        if (description.toLowerCase().includes('every hour')) requirements.scheduling = 'hourly';
        else if (description.toLowerCase().includes('every day')) requirements.scheduling = 'daily';
        else if (description.toLowerCase().includes('weekly')) requirements.scheduling = 'weekly';
        else if (description.toLowerCase().includes('monthly')) requirements.scheduling = 'monthly';
      }
      
      // Set conditional logic flag
      if (opKeyword.operation === 'condition') {
        requirements.conditionalLogic = true;
      }
    }
  });
  
  // Look for data types
  const dataTypeKeywords = [
    { keywords: ['json', 'api response'], dataType: 'json' },
    { keywords: ['csv', 'excel', 'spreadsheet'], dataType: 'tabular' },
    { keywords: ['text', 'string'], dataType: 'text' },
    { keywords: ['image', 'photo', 'picture'], dataType: 'image' },
    { keywords: ['email'], dataType: 'email' }
  ];
  
  dataTypeKeywords.forEach(dtKeyword => {
    if (dtKeyword.keywords.some(keyword => description.toLowerCase().includes(keyword))) {
      if (!requirements.dataTypes.includes(dtKeyword.dataType)) {
        requirements.dataTypes.push(dtKeyword.dataType);
      }
    }
  });
  
  // Determine template based on keywords
  if (description.toLowerCase().includes('api') && requirements.operations.includes('fetch')) {
    requirements.templateId = 'api-request';
  } else if (description.toLowerCase().includes('social media') || 
             description.toLowerCase().includes('twitter') || 
             description.toLowerCase().includes('reddit')) {
    requirements.templateId = 'social-media-monitoring';
  } else if (requirements.operations.includes('notify')) {
    requirements.templateId = 'notification';
  } else if (requirements.operations.includes('process') || 
            (requirements.operations.includes('fetch') && requirements.operations.includes('store'))) {
    requirements.templateId = 'data-processing';
  }
  
  // Determine complexity
  if (requirements.operations.length >= 4 || (requirements.conditionalLogic && requirements.operations.length >= 3)) {
    requirements.complexity = 'complex';
  } else if (requirements.operations.length >= 2 || requirements.conditionalLogic) {
    requirements.complexity = 'medium';
  }
  
  return requirements;
}

/**
 * Determine which nodes are needed for the workflow
 */
function determineRequiredNodes(requirements: WorkflowRequirements, explicitNodes: string[] = []): string[] {
  const nodes: string[] = [];
  
  // Always start with a trigger node
  if (requirements.operations.includes('schedule')) {
    nodes.push('n8n-nodes-base.scheduleTrigger');
  } else {
    nodes.push('n8n-nodes-base.start');
  }
  
  // Add nodes based on operations
  if (requirements.operations.includes('fetch')) {
    nodes.push('n8n-nodes-base.httpRequest');
  }
  
  if (requirements.operations.includes('process')) {
    nodes.push('n8n-nodes-base.function');
    nodes.push('n8n-nodes-base.set');
  }
  
  if (requirements.operations.includes('notify')) {
    if (requirements.description.toLowerCase().includes('email')) {
      nodes.push('n8n-nodes-base.email');
    }
    if (requirements.description.toLowerCase().includes('slack')) {
      nodes.push('n8n-nodes-base.slack');
    }
  }
  
  if (requirements.conditionalLogic) {
    nodes.push('n8n-nodes-base.if');
  }
  
  if (requirements.operations.includes('store')) {
    if (requirements.description.toLowerCase().includes('google sheet')) {
      nodes.push('n8n-nodes-base.googleSheets');
    }
  }
  
  // Add explicitly required nodes
  explicitNodes.forEach(node => {
    if (!nodes.includes(node)) {
      nodes.push(node);
    }
  });
  
  return nodes;
}

/**
 * Create node structure for the workflow
 */
function createNodeStructure(nodeTypes: string[], requirements: WorkflowRequirements): N8nNode[] {
  const nodes: N8nNode[] = [];
  let xPosition = 100;
  const yPosition = 300;
  
  // If we have a template ID, use it to generate the workflow structure
  if (requirements.templateId && workflowTemplates[requirements.templateId]) {
    const templateParams: WorkflowTemplateParams = {
      name: requirements.name,
      description: requirements.description,
      parameters: {}
    };
    
    // Customize template parameters based on requirements
    if (requirements.templateId === 'social-media-monitoring') {
      templateParams.parameters = {
        platforms: ['twitter', 'reddit'].filter(p => 
          requirements.description.toLowerCase().includes(p)
        ),
        keywords: requirements.description
          .toLowerCase()
          .match(/keywords?:?\s+([^.]+)/i)?.[1]
          .split(',')
          .map(k => k.trim()) || ['automation', 'workflow']
      };
    }
    else if (requirements.templateId === 'api-request') {
      const apiUrlMatch = requirements.description.match(/api:?\s+([^\s,]+)/i);
      
      templateParams.parameters = {
        apiUrl: apiUrlMatch?.[1] || 'https://api.example.com/data',
        method: requirements.description.toLowerCase().includes('post') ? 'POST' : 'GET'
      };
    }
    else if (requirements.templateId === 'notification') {
      templateParams.parameters = {
        trigger: requirements.operations.includes('schedule') ? 'schedule' : 'manual',
        notificationChannels: []
      };
      
      if (requirements.description.toLowerCase().includes('email')) {
        templateParams.parameters.notificationChannels.push('email');
      }
      if (requirements.description.toLowerCase().includes('slack')) {
        templateParams.parameters.notificationChannels.push('slack');
      }
      
      if (requirements.scheduling) {
        if (!templateParams.parameters.triggerConfig) {
          templateParams.parameters.triggerConfig = {};
        }
        
        let cronExpression = '0 9 * * *'; // Default: 9 AM daily
        
        if (requirements.scheduling === 'hourly') cronExpression = '0 * * * *';
        else if (requirements.scheduling === 'daily') cronExpression = '0 9 * * *';
        else if (requirements.scheduling === 'weekly') cronExpression = '0 9 * * 1'; // Mondays
        else if (requirements.scheduling === 'monthly') cronExpression = '0 9 1 * *'; // 1st of month
        
        templateParams.parameters.triggerConfig.schedule = cronExpression;
      }
    }
    
    // Generate workflow from template
    const workflow = workflowTemplates[requirements.templateId].generateWorkflow(templateParams);
    return workflow.nodes;
  }
  
  // If no template or custom generation needed, create nodes manually
  nodeTypes.forEach((nodeType, index) => {
    const definition = nodeDefinitions[nodeType];
    if (!definition) return;
    
    const nodeId = createNodeId(nodeType, index + 1);
    const position: [number, number] = [xPosition, yPosition];
    
    let customParameters = {};
    let customName;
    
    // Customize parameters based on node type and requirements
    if (nodeType === 'n8n-nodes-base.scheduleTrigger' && requirements.scheduling) {
      let cronExpression = '0 9 * * *'; // Default: 9 AM daily
      
      if (requirements.scheduling === 'hourly') cronExpression = '0 * * * *';
      else if (requirements.scheduling === 'daily') cronExpression = '0 9 * * *';
      else if (requirements.scheduling === 'weekly') cronExpression = '0 9 * * 1'; // Mondays
      else if (requirements.scheduling === 'monthly') cronExpression = '0 9 1 * *'; // 1st of month
      
      customParameters = {
        interval: [{
          field: 'cronExpression',
          expression: cronExpression
        }]
      };
      customName = 'Schedule Trigger';
    } else if (nodeType === 'n8n-nodes-base.httpRequest') {
      const apiUrlMatch = requirements.description.match(/api:?\s+([^\s,]+)/i);
      
      customParameters = {
        url: apiUrlMatch?.[1] || 'https://api.example.com/data',
        method: requirements.description.toLowerCase().includes('post') ? 'POST' : 'GET'
      };
      customName = 'API Request';
    } else if (nodeType === 'n8n-nodes-base.function') {
      customParameters = {
        functionCode: `// Process the data from the previous node
return items.map(item => {
  // Add your processing logic here
  return {
    json: {
      ...item.json,
      processed: true,
      timestamp: new Date().toISOString()
    }
  };
});`
      };
      customName = 'Process Data';
    }
    
    // Create the node
    const node = createNode(definition, nodeId, position, customParameters, customName);
    nodes.push(node);
    
    // Increment x position for next node
    xPosition += 200;
  });
  
  return nodes;
}

/**
 * Create connections between nodes
 */
function createConnections(nodes: N8nNode[]): N8nConnections {
  const connections: N8nConnections = { main: {} };
  
  // Connect nodes in sequence
  for (let i = 0; i < nodes.length - 1; i++) {
    const currentNode = nodes[i];
    const nextNode = nodes[i + 1];
    
    // Skip if the current node has no outputs
    if (!nodeDefinitions[currentNode.type]?.outputs?.length) continue;
    
    // Handle IF node differently (has two outputs)
    if (currentNode.type === 'n8n-nodes-base.if') {
      // Find the closest nodes after the IF node
      const remainingNodes = nodes.slice(i + 1);
      
      if (remainingNodes.length >= 2) {
        // Connect IF node to the next two nodes (true/false branches)
        if (!connections.main[currentNode.name]) {
          connections.main[currentNode.name] = { main: [] };
        }
        
        // True branch (first output)
        connections.main[currentNode.name].main.push({
          node: remainingNodes[0].name,
          type: 'main',
          index: 0
        });
        
        // False branch (second output)
        connections.main[currentNode.name].main.push({
          node: remainingNodes[1].name,
          type: 'main',
          index: 1
        });
        
        // Skip the next iteration as we've already connected to the next node
        i++;
      } else {
        // Not enough nodes to connect both branches, so just connect the first branch
        if (!connections.main[currentNode.name]) {
          connections.main[currentNode.name] = { main: [] };
        }
        
        connections.main[currentNode.name].main.push({
          node: nextNode.name,
          type: 'main',
          index: 0
        });
      }
    } else {
      // Regular node-to-node connection
      if (!connections.main[currentNode.name]) {
        connections.main[currentNode.name] = { main: [] };
      }
      
      connections.main[currentNode.name].main.push({
        node: nextNode.name,
        type: 'main',
        index: 0
      });
    }
  }
  
  return connections;
}

/**
 * Validate the workflow
 */
function validateWorkflow(workflow: N8nWorkflow): void {
  // Ensure workflow has name
  if (!workflow.name) {
    throw new Error('Workflow must have a name');
  }
  
  // Ensure workflow has at least one node
  if (!workflow.nodes || workflow.nodes.length === 0) {
    throw new Error('Workflow must have at least one node');
  }
  
  // Ensure trigger node exists
  const hasTriggerNode = workflow.nodes.some(node => 
    node.type.includes('Trigger') || node.type === 'n8n-nodes-base.start');
  
  if (!hasTriggerNode) {
    throw new Error('Workflow must have a trigger node');
  }
  
  // Basic connection validation
  for (const [sourceName, sourceConnections] of Object.entries(workflow.connections.main)) {
    for (const [type, connections] of Object.entries(sourceConnections)) {
      for (const connection of connections) {
        const targetNode = workflow.nodes.find(n => n.name === connection.node);
        if (!targetNode) {
          throw new Error(`Connection points to non-existent node: ${connection.node}`);
        }
      }
    }
  }
}

/**
 * Generate explanations for each node
 */
function generateExplanations(workflow: N8nWorkflow, requirements: WorkflowRequirements): Record<string, string> {
  const explanations: Record<string, string> = {};
  
  workflow.nodes.forEach(node => {
    let explanation = `Node "${node.name}" (${node.type.replace('n8n-nodes-base.', '')}): `;
    
    // Get node description based on type
    if (node.type === 'n8n-nodes-base.start') {
      explanation += 'Starts the workflow execution manually.';
    } else if (node.type === 'n8n-nodes-base.scheduleTrigger') {
      const cronExp = node.parameters.interval?.[0]?.expression || '0 * * * *';
      explanation += `Triggers the workflow on schedule (${cronExp}).`;
    } else if (node.type === 'n8n-nodes-base.httpRequest') {
      explanation += `Makes a ${node.parameters.method} request to ${node.parameters.url}.`;
    } else if (node.type === 'n8n-nodes-base.function') {
      explanation += 'Processes data using custom JavaScript code.';
    } else if (node.type === 'n8n-nodes-base.if') {
      explanation += 'Splits the workflow based on conditions.';
    } else if (node.type === 'n8n-nodes-base.set') {
      explanation += 'Sets or modifies data values.';
    } else if (node.type === 'n8n-nodes-base.email') {
      explanation += `Sends email to ${node.parameters.toEmail}.`;
    } else if (node.type === 'n8n-nodes-base.slack') {
      explanation += `Sends message to Slack channel ${node.parameters.channel}.`;
    } else if (node.type === 'n8n-nodes-base.googleSheets') {
      explanation += `${node.parameters.operation === 'read' ? 'Reads data from' : 'Writes data to'} Google Sheets.`;
    } else if (node.type === 'n8n-nodes-base.twitter') {
      explanation += `${node.parameters.operation === 'search' ? 'Searches for tweets' : 'Posts to Twitter'}.`;
    } else if (node.type === 'n8n-nodes-base.reddit') {
      explanation += `${node.parameters.operation === 'search' ? 'Searches Reddit' : 'Interacts with Reddit'}.`;
    } else {
      explanation += 'Performs node-specific operations.';
    }
    
    explanations[node.name] = explanation;
  });
  
  return explanations;
}

/**
 * Generate setup instructions
 */
function generateSetupInstructions(workflow: N8nWorkflow): string {
  let instructions = `## Setup Instructions for "${workflow.name}"\n\n`;
  
  // Check if credentials are needed
  const credentialTypes = new Set<string>();
  
  workflow.nodes.forEach(node => {
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters.authentication !== 'none') {
      credentialTypes.add('HTTP Authentication');
    } else if (node.type === 'n8n-nodes-base.email') {
      credentialTypes.add('Email (SMTP)');
    } else if (node.type === 'n8n-nodes-base.googleSheets') {
      credentialTypes.add('Google Sheets');
    } else if (node.type === 'n8n-nodes-base.slack') {
      credentialTypes.add('Slack');
    } else if (node.type === 'n8n-nodes-base.twitter') {
      credentialTypes.add('Twitter');
    } else if (node.type === 'n8n-nodes-base.reddit') {
      credentialTypes.add('Reddit');
    }
  });
  
  if (credentialTypes.size > 0) {
    instructions += "### Required Credentials\n\n";
    credentialTypes.forEach(credType => {
      instructions += `- ${credType}\n`;
    });
    instructions += "\nPlease set up the above credentials in n8n before running the workflow.\n\n";
  }
  
  instructions += "### Usage Instructions\n\n";
  
  // Check for trigger type
  const triggerNode = workflow.nodes.find(node => 
    node.type.includes('Trigger') || node.type === 'n8n-nodes-base.start');
  
  if (triggerNode) {
    if (triggerNode.type === 'n8n-nodes-base.start') {
      instructions += "1. This workflow needs to be started manually from the n8n editor.\n";
    } else if (triggerNode.type === 'n8n-nodes-base.scheduleTrigger') {
      instructions += "1. This workflow will run automatically based on the configured schedule.\n";
      instructions += "2. You must activate the workflow to enable the schedule.\n";
    }
  }
  
  // Add any special node configuration instructions
  const httpNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.httpRequest');
  if (httpNode) {
    instructions += "\n### API Configuration\n\n";
    instructions += `The workflow is configured to make ${httpNode.parameters.method} requests to: ${httpNode.parameters.url}\n`;
    instructions += "You may need to update this URL or add authentication depending on your API requirements.\n";
  }
  
  return instructions;
}

/**
 * Generate workflow from natural language description
 */
export async function generateWorkflow(params: ExecuteParams): Promise<ExecuteResult> {
  try {
    const input = params.input as WorkflowGenerationInput;
    
    if (!input.description) {
      return {
        error: {
          message: 'Workflow description is required'
        }
      };
    }
    
    // 1. Parse requirements from the description
    const requirements = parseWorkflowRequirements(input.description);
    
    // Apply any explicit overrides from the input
    if (input.complexity) {
      requirements.complexity = input.complexity;
    }
    
    // 2. Determine needed nodes (both explicitly required and implied)
    const neededNodes = determineRequiredNodes(requirements, input.requiredNodes);
    
    // 3. Create node structure with proper configurations
    const nodes = createNodeStructure(neededNodes, requirements);
    
    // 4. Create connections between nodes
    const connections = createConnections(nodes);
    
    // 5. Create the complete workflow
    const workflow: N8nWorkflow = {
      name: requirements.name,
      description: requirements.description,
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
        saveExecutionProgress: true,
        saveManualExecutions: true
      }
    };
    
    // 6. Validate the workflow
    validateWorkflow(workflow);
    
    // 7. Generate explanations for each node
    const explanations = generateExplanations(workflow, requirements);
    
    // 8. Generate setup instructions
    const setupInstructions = input.includeCredentials 
      ? generateSetupInstructions(workflow) 
      : undefined;
    
    return {
      data: {
        workflow,
        explanations,
        setupInstructions
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Failed to generate workflow',
        stack: error.stack
      }
    };
  }
} 