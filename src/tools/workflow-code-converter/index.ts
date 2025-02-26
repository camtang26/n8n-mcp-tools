/**
 * n8n Workflow-as-Code Converter Tool
 * 
 * This tool converts between JSON workflow definitions and code representations,
 * making it easier to version control, understand, and edit workflows programmatically.
 */

import { MCP, MCPRequest, MCPResponse } from '@modelcontextprotocol/sdk';
import { N8nWorkflow, N8nNode } from '../../types/n8n';

/**
 * Input for the workflow code converter
 */
export interface WorkflowCodeConverterInput {
  /** The workflow to convert (either as JSON or code) */
  workflow: string | N8nWorkflow;
  /** The target format to convert to */
  targetFormat: 'typescript' | 'javascript' | 'python' | 'json';
  /** Optional name for the workflow in the generated code */
  workflowName?: string;
  /** Whether to include detailed comments in the generated code */
  includeComments?: boolean;
  /** Whether to include import statements in code output */
  includeImports?: boolean;
}

/**
 * Output from the workflow code converter
 */
export interface WorkflowCodeConverterOutput {
  /** The converted workflow in the target format */
  convertedWorkflow: string;
  /** Any warnings or messages about the conversion */
  messages?: string[];
  /** Optional metadata about the workflow */
  metadata?: {
    nodeCount: number;
    connectionCount: number;
    triggerNodes: string[];
    requiredCredentials: string[];
  };
}

/**
 * Detect if the input is a JSON string or object and parse it if needed
 */
function parseWorkflowInput(input: string | N8nWorkflow): N8nWorkflow {
  if (typeof input === 'string') {
    try {
      // First try to parse as JSON
      return JSON.parse(input);
    } catch (e) {
      // If it's not valid JSON, try to parse as code
      return parseCodeToWorkflow(input);
    }
  }
  return input;
}

/**
 * Parse code representation back to a workflow object
 */
function parseCodeToWorkflow(code: string): N8nWorkflow {
  try {
    const messages: string[] = [];
    
    // Try to identify the language
    let language: 'typescript' | 'javascript' | 'python' = 'javascript';
    if (code.includes('import') && code.includes('from') && (code.includes(': ') || code.includes('interface'))) {
      language = 'typescript';
    } else if (code.includes('def ') && code.includes('import ') && code.includes('python')) {
      language = 'python';
    }
    
    let workflowJson: N8nWorkflow;
    
    if (language === 'typescript' || language === 'javascript') {
      // Extract the workflow object from JS/TS code
      const workflowMatch = code.match(/const\s+workflow\s*=\s*({[\s\S]*?});?\s*$/m) || 
                            code.match(/export\s+const\s+workflow\s*=\s*({[\s\S]*?});?\s*$/m) ||
                            code.match(/let\s+workflow\s*=\s*({[\s\S]*?});?\s*$/m) ||
                            code.match(/var\s+workflow\s*=\s*({[\s\S]*?});?\s*$/m);
      
      if (!workflowMatch) {
        throw new Error('Could not locate workflow definition in the provided code.');
      }
      
      // Execute the code in a safe context to get the workflow object
      const workflowStr = workflowMatch[1];
      
      // Replace any array.map calls with literals to make it easier to evaluate
      const simplifiedStr = workflowStr
        .replace(/\.map\((.*?)=>(.*?)\)/g, '')
        .replace(/\[(.*?)\.map\((.*?)\)\]/g, '[]');
      
      // Basic eval approach - this is limited but safer than a full eval
      // In a real implementation, you'd use a proper JS parser/evaluator
      const evalStr = `(${simplifiedStr})`;
      
      try {
        workflowJson = eval(evalStr);
        messages.push('Successfully parsed code to workflow object, but some dynamic parts might have been simplified.');
      } catch (evalError) {
        // If eval fails, try a more basic approach to extract JSON-like structure
        const nodesMatch = workflowStr.match(/nodes\s*:\s*(\[[\s\S]*?\])/m);
        const connectionsMatch = workflowStr.match(/connections\s*:\s*({[\s\S]*?})/m);
        const nameMatch = workflowStr.match(/name\s*:\s*['"](.+?)['"]/m);
        
        if (nodesMatch && connectionsMatch) {
          try {
            const nodesStr = nodesMatch[1].replace(/\/\/.*/g, '');
            const connectionsStr = connectionsMatch[1].replace(/\/\/.*/g, '');
            
            workflowJson = {
              name: nameMatch ? nameMatch[1] : 'Imported Workflow',
              nodes: eval(`(${nodesStr})`),
              connections: eval(`(${connectionsStr})`),
              active: true,
              settings: {}
            };
            messages.push('Parsed workflow using pattern matching. Some properties might be missing or incorrect.');
          } catch (e) {
            throw new Error('Failed to parse the workflow structure from the code.');
          }
        } else {
          throw new Error('Could not identify nodes and connections in the provided code.');
        }
      }
    } else if (language === 'python') {
      // Simple parsing of Python code (very basic implementation)
      const workflowNameMatch = code.match(/workflow_name\s*=\s*['"](.*?)['"]/m);
      const nodeBlocks = code.split('# Node:').slice(1);
      
      const nodes: N8nNode[] = [];
      
      for (const block of nodeBlocks) {
        const nameMatch = block.match(/name:\s*['"](.*?)['"]/m);
        const typeMatch = block.match(/type:\s*['"](.*?)['"]/m);
        const positionMatch = block.match(/position:\s*{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*}/m);
        
        if (nameMatch && typeMatch && positionMatch) {
          nodes.push({
            name: nameMatch[1],
            type: typeMatch[1],
            position: [parseInt(positionMatch[1]), parseInt(positionMatch[2])],
            parameters: {}, // Would need more complex parsing for parameters
            typeVersion: 1,
            id: `node-${nodes.length}`
          } as any);
        }
      }
      
      // Extract connections - this is a very simplified approach
      const connectionBlocks = code.match(/# Connections([\s\S]*?)(?=# |$)/m);
      const connections: any = { main: [] };
      
      if (connectionBlocks && connectionBlocks[1]) {
        const connectionLines = connectionBlocks[1].trim().split('\n');
        for (const line of connectionLines) {
          const match = line.match(/connect\(['"](.+?)['"],\s*(\d+),\s*['"](.+?)['"],\s*(\d+)\)/);
          if (match) {
            const [_, fromNode, fromOutput, toNode, toInput] = match;
            
            // Ensure the array for this output index exists
            if (!connections.main[parseInt(fromOutput)]) {
              connections.main[parseInt(fromOutput)] = [];
            }
            
            connections.main[parseInt(fromOutput)].push({
              node: toNode,
              type: 'main',
              index: parseInt(toInput)
            });
          }
        }
      }
      
      workflowJson = {
        name: workflowNameMatch ? workflowNameMatch[1] : 'Imported Python Workflow',
        nodes,
        connections,
        active: true,
        settings: {}
      };
      
      messages.push('Converted from Python with limited parsing. Parameters and some properties might be missing.');
    } else {
      throw new Error('Could not determine the code language.');
    }
    
    return workflowJson;
  } catch (error) {
    throw new Error(`Failed to parse code to workflow: ${(error as Error).message}`);
  }
}

/**
 * Convert a workflow to TypeScript code
 */
function workflowToTypeScript(
  workflow: N8nWorkflow, 
  workflowName?: string,
  includeComments: boolean = true,
  includeImports: boolean = true
): string {
  const name = workflowName || workflow.name || 'n8nWorkflow';
  const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  
  let code = '';
  
  if (includeImports) {
    code += `import { IWorkflowBase } from 'n8n-workflow';\n\n`;
  }
  
  if (includeComments) {
    code += `/**\n`;
    code += ` * ${workflow.name || 'n8n Workflow'}\n`;
    if (workflow.description) {
      code += ` * \n`;
      code += ` * ${workflow.description}\n`;
    }
    code += ` * \n`;
    code += ` * This workflow contains ${workflow.nodes.length} nodes and ${countConnections(workflow.connections)} connections.\n`;
    code += ` */\n\n`;
  }
  
  code += `export const ${sanitizedName}: IWorkflowBase = {\n`;
  code += `  name: "${workflow.name || ''}",\n`;
  
  if (workflow.active !== undefined) {
    code += `  active: ${workflow.active},\n`;
  }
  
  if (workflow.id) {
    code += `  id: "${workflow.id}",\n`;
  }
  
  // Add nodes with comments
  code += `  nodes: [\n`;
  for (const node of workflow.nodes) {
    if (includeComments) {
      code += `    // ${node.name} (${node.type})\n`;
    }
    code += `    {\n`;
    code += `      id: "${node.id || ''}",\n`;
    code += `      name: "${node.name}",\n`;
    code += `      type: "${node.type}",\n`;
    code += `      position: [${node.position[0]}, ${node.position[1]}],\n`;
    
    if (node.typeVersion) {
      code += `      typeVersion: ${node.typeVersion},\n`;
    }
    
    if (node.parameters && Object.keys(node.parameters).length > 0) {
      code += `      parameters: ${formatParametersAsCode(node.parameters, 6)},\n`;
    } else {
      code += `      parameters: {},\n`;
    }
    
    if (node.credentials && Object.keys(node.credentials).length > 0) {
      code += `      credentials: ${JSON.stringify(node.credentials, null, 2).replace(/\n/g, '\n      ')},\n`;
    }
    
    code += `    },\n`;
  }
  code += `  ],\n`;
  
  // Add connections
  code += `  connections: {\n`;
  
  // Main connections
  if (workflow.connections.main && workflow.connections.main.length > 0) {
    if (includeComments) {
      code += `    // Main connections between nodes\n`;
    }
    code += `    main: [\n`;
    for (let i = 0; i < workflow.connections.main.length; i++) {
      const outputConnections = workflow.connections.main[i];
      if (outputConnections && outputConnections.length > 0) {
        code += `      [\n`;
        for (const connection of outputConnections) {
          if (includeComments) {
            // Find source node name
            const sourceNode = workflow.nodes.find(n => {
              const connectionNode = workflow.nodes.find(cn => cn.name === connection.node);
              return connectionNode && workflow.connections.main.some(conn => 
                conn && conn.some(c => c.node === connectionNode.name)
              );
            });
            
            if (sourceNode) {
              code += `        // ${sourceNode.name} -> ${connection.node}\n`;
            }
          }
          code += `        {\n`;
          code += `          node: "${connection.node}",\n`;
          code += `          type: "${connection.type || 'main'}",\n`;
          if (connection.index !== undefined) {
            code += `          index: ${connection.index},\n`;
          }
          code += `        },\n`;
        }
        code += `      ],\n`;
      } else {
        code += `      [],\n`;
      }
    }
    code += `    ],\n`;
  } else {
    code += `    main: [],\n`;
  }
  
  // Add other connection types if they exist
  if (workflow.connections.other) {
    code += `    other: ${JSON.stringify(workflow.connections.other, null, 2).replace(/\n/g, '\n    ')},\n`;
  }
  
  code += `  },\n`;
  
  // Add settings if they exist
  if (workflow.settings && Object.keys(workflow.settings).length > 0) {
    code += `  settings: ${JSON.stringify(workflow.settings, null, 2).replace(/\n/g, '\n  ')},\n`;
  } else {
    code += `  settings: {},\n`;
  }
  
  // Add other properties if they exist
  if (workflow.pinData) {
    code += `  pinData: ${JSON.stringify(workflow.pinData, null, 2).replace(/\n/g, '\n  ')},\n`;
  }
  
  if (workflow.tags && workflow.tags.length > 0) {
    code += `  tags: ${JSON.stringify(workflow.tags, null, 2).replace(/\n/g, '\n  ')},\n`;
  }
  
  code += `};\n`;
  
  if (includeComments) {
    code += `\n// Helper functions to work with this workflow\n`;
    code += `export function getTriggerNodes() {\n`;
    code += `  return ${sanitizedName}.nodes.filter(node => [\n`;
    code += `    'n8n-nodes-base.scheduleTrigger',\n`;
    code += `    'n8n-nodes-base.httpTrigger',\n`;
    code += `    'n8n-nodes-base.webhook',\n`;
    code += `    // Add other trigger node types as needed\n`;
    code += `  ].includes(node.type));\n`;
    code += `}\n\n`;
    
    code += `export function getNodeByName(name: string) {\n`;
    code += `  return ${sanitizedName}.nodes.find(node => node.name === name);\n`;
    code += `}\n`;
  }
  
  return code;
}

/**
 * Format node parameters as readable code
 */
function formatParametersAsCode(parameters: Record<string, any>, indentLevel: number = 0): string {
  if (!parameters || Object.keys(parameters).length === 0) {
    return '{}';
  }
  
  const indent = ' '.repeat(indentLevel);
  const inlineJson = JSON.stringify(parameters, null, 2);
  
  // Replace expression placeholders in JSON with actual expressions
  // This is a simplified approach - a real implementation would need more robust parsing
  const withExpressions = inlineJson.replace(/"={{(.*?)}}"/g, '{{$1}}');
  
  // Format with proper indentation
  return withExpressions
    .replace(/\n/g, `\n${indent}`)
    .replace(/\{\{(.*?)\}\}/g, (_, expr) => `\`\${${expr}}\``);
}

/**
 * Convert a workflow to JavaScript code
 */
function workflowToJavaScript(
  workflow: N8nWorkflow, 
  workflowName?: string,
  includeComments: boolean = true,
  includeImports: boolean = false
): string {
  // Similar to TypeScript but without type annotations
  const tsCode = workflowToTypeScript(workflow, workflowName, includeComments, false);
  
  let jsCode = tsCode
    .replace(/import.*from.*;\n\n/g, '')
    .replace(/:.*IWorkflowBase/g, '');
  
  if (includeImports) {
    jsCode = `// n8n workflow definition\n\n` + jsCode;
  }
  
  // Remove TypeScript-specific syntax
  jsCode = jsCode.replace(/: string/g, '')
    .replace(/: number/g, '')
    .replace(/: boolean/g, '')
    .replace(/: any/g, '')
    .replace(/: \[\]/g, '')
    .replace(/: \{\}/g, '');
  
  return jsCode;
}

/**
 * Convert a workflow to Python code
 */
function workflowToPython(
  workflow: N8nWorkflow, 
  workflowName?: string,
  includeComments: boolean = true,
  includeImports: boolean = true
): string {
  const name = workflowName || workflow.name || 'n8n_workflow';
  const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  
  let code = '';
  
  if (includeImports) {
    code += `# n8n workflow definition in Python\n`;
    code += `import json\n\n`;
  }
  
  if (includeComments) {
    code += `# ${workflow.name || 'n8n Workflow'}\n`;
    if (workflow.description) {
      code += `# \n`;
      code += `# ${workflow.description}\n`;
    }
    code += `# \n`;
    code += `# This workflow contains ${workflow.nodes.length} nodes and ${countConnections(workflow.connections)} connections.\n`;
    code += `\n`;
  }
  
  code += `workflow_name = "${workflow.name || ''}"\n`;
  code += `workflow_id = "${workflow.id || ''}"\n`;
  code += `workflow_active = ${workflow.active ? 'True' : 'False'}\n\n`;
  
  // Define nodes
  code += `# Define nodes\nnodes = []\n\n`;
  
  for (const node of workflow.nodes) {
    if (includeComments) {
      code += `# Node: ${node.name} (${node.type})\n`;
    }
    
    code += `node_${node.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()} = {\n`;
    code += `    "id": "${node.id || ''}",\n`;
    code += `    "name": "${node.name}",\n`;
    code += `    "type": "${node.type}",\n`;
    code += `    "position": [${node.position[0]}, ${node.position[1]}],\n`;
    
    if (node.typeVersion) {
      code += `    "typeVersion": ${node.typeVersion},\n`;
    }
    
    if (node.parameters && Object.keys(node.parameters).length > 0) {
      code += `    "parameters": ${JSON.stringify(node.parameters, null, 4).replace(/\n/g, '\n    ')},\n`;
    } else {
      code += `    "parameters": {},\n`;
    }
    
    if (node.credentials && Object.keys(node.credentials).length > 0) {
      code += `    "credentials": ${JSON.stringify(node.credentials, null, 4).replace(/\n/g, '\n    ')},\n`;
    }
    
    code += `}\n`;
    code += `nodes.append(node_${node.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()})\n\n`;
  }
  
  // Define connections
  code += `# Connections between nodes\n`;
  code += `connections = {"main": []}\n\n`;
  
  // Helper function to create connections
  code += `def connect(from_node, from_output, to_node, to_input):\n`;
  code += `    # Ensure we have enough arrays in the main connections list\n`;
  code += `    while len(connections["main"]) <= from_output:\n`;
  code += `        connections["main"].append([])\n`;
  code += `    \n`;
  code += `    # Add the connection\n`;
  code += `    connections["main"][from_output].append({\n`;
  code += `        "node": to_node,\n`;
  code += `        "type": "main",\n`;
  code += `        "index": to_input\n`;
  code += `    })\n\n`;
  
  // Create connections
  if (workflow.connections.main && workflow.connections.main.length > 0) {
    code += `# Define the workflow connections\n`;
    for (let i = 0; i < workflow.connections.main.length; i++) {
      const outputConnections = workflow.connections.main[i];
      if (outputConnections && outputConnections.length > 0) {
        for (const connection of outputConnections) {
          // Find source node by looking at connections
          const sourceNode = workflow.nodes.find(node => {
            return workflow.connections.main.some((conns, index) => 
              conns && conns.some(conn => 
                conn.node === connection.node && index === i
              )
            );
          });
          
          if (sourceNode) {
            const sourceNodeName = sourceNode.name.replace(/[^a-zA-Z0-9_]/g, '_');
            if (includeComments) {
              code += `# Connect ${sourceNode.name} to ${connection.node}\n`;
            }
            code += `connect("${sourceNode.name}", ${i}, "${connection.node}", ${connection.index || 0})\n`;
          }
        }
        code += `\n`;
      }
    }
  }
  
  // Create workflow object
  code += `# Complete workflow definition\n`;
  code += `${sanitizedName} = {\n`;
  code += `    "name": workflow_name,\n`;
  code += `    "id": workflow_id,\n`;
  code += `    "active": workflow_active,\n`;
  code += `    "nodes": nodes,\n`;
  code += `    "connections": connections,\n`;
  
  // Add settings if they exist
  if (workflow.settings && Object.keys(workflow.settings).length > 0) {
    code += `    "settings": ${JSON.stringify(workflow.settings, null, 4).replace(/\n/g, '\n    ')},\n`;
  } else {
    code += `    "settings": {},\n`;
  }
  
  code += `}\n\n`;
  
  // Add helper function to export as JSON
  if (includeComments) {
    code += `# Helper function to export the workflow as JSON\n`;
    code += `def export_workflow_json():\n`;
    code += `    return json.dumps(${sanitizedName}, indent=2)\n\n`;
    
    code += `# Helper function to save workflow to a file\n`;
    code += `def save_workflow_to_file(filename):\n`;
    code += `    with open(filename, 'w') as f:\n`;
    code += `        f.write(export_workflow_json())\n\n`;
    
    code += `# Example usage:\n`;
    code += `# save_workflow_to_file("${sanitizedName}.json")\n`;
  }
  
  return code;
}

/**
 * Format a workflow as formatted JSON
 */
function workflowToJSON(workflow: N8nWorkflow): string {
  return JSON.stringify(workflow, null, 2);
}

/**
 * Count the total number of connections in a workflow
 */
function countConnections(connections: any): number {
  let count = 0;
  
  if (connections.main) {
    for (const outputConnections of connections.main) {
      if (outputConnections) {
        count += outputConnections.length;
      }
    }
  }
  
  return count;
}

/**
 * Extract metadata from a workflow
 */
function extractWorkflowMetadata(workflow: N8nWorkflow): WorkflowCodeConverterOutput['metadata'] {
  // Count connections
  const connectionCount = countConnections(workflow.connections);
  
  // Identify trigger nodes
  const triggerNodeTypes = [
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.httpTrigger',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.eventTrigger',
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.emailTrigger',
    'n8n-nodes-base.telegramTrigger',
    'n8n-nodes-base.githubTrigger',
    'n8n-nodes-base.surveymonkeyTrigger'
  ];
  
  const triggerNodes = workflow.nodes
    .filter(node => triggerNodeTypes.includes(node.type))
    .map(node => node.name);
  
  // Extract credential types
  const requiredCredentials: string[] = [];
  for (const node of workflow.nodes) {
    if (node.credentials) {
      for (const credType of Object.keys(node.credentials)) {
        if (!requiredCredentials.includes(credType)) {
          requiredCredentials.push(credType);
        }
      }
    }
  }
  
  return {
    nodeCount: workflow.nodes.length,
    connectionCount,
    triggerNodes,
    requiredCredentials
  };
}

/**
 * Main function to convert workflows between formats
 */
export function convertWorkflow(
  input: WorkflowCodeConverterInput
): WorkflowCodeConverterOutput {
  try {
    const messages: string[] = [];
    
    // Parse the input workflow
    const workflow = parseWorkflowInput(input.workflow);
    
    // Check if the workflow is valid
    if (!workflow.nodes || !workflow.connections) {
      throw new Error('Invalid workflow: missing nodes or connections.');
    }
    
    // Convert to the target format
    let convertedWorkflow = '';
    switch (input.targetFormat) {
      case 'typescript':
        convertedWorkflow = workflowToTypeScript(
          workflow,
          input.workflowName,
          input.includeComments !== false,
          input.includeImports !== false
        );
        break;
        
      case 'javascript':
        convertedWorkflow = workflowToJavaScript(
          workflow,
          input.workflowName,
          input.includeComments !== false,
          input.includeImports !== false
        );
        break;
        
      case 'python':
        convertedWorkflow = workflowToPython(
          workflow,
          input.workflowName,
          input.includeComments !== false,
          input.includeImports !== false
        );
        break;
        
      case 'json':
        convertedWorkflow = workflowToJSON(workflow);
        break;
        
      default:
        throw new Error(`Unsupported target format: ${input.targetFormat}`);
    }
    
    // Extract metadata
    const metadata = extractWorkflowMetadata(workflow);
    
    return {
      convertedWorkflow,
      messages,
      metadata
    };
  } catch (error) {
    throw new Error(`Workflow conversion failed: ${(error as Error).message}`);
  }
}

/**
 * MCP Tool handler for the Workflow Code Converter
 */
export default {
  name: 'convertWorkflow',
  title: 'n8n Workflow-as-Code Converter',
  description: 'Convert between n8n workflow JSON and code representations for better version control and editing',
  schema: MCP.schema.object({
    workflow: MCP.schema.union([
      MCP.schema.string({
        description: 'The workflow JSON string or code to convert'
      }),
      MCP.schema.object({
        description: 'The workflow object to convert'
      })
    ]),
    targetFormat: MCP.schema.string({
      description: 'The target format to convert to',
      enum: ['typescript', 'javascript', 'python', 'json']
    }),
    workflowName: MCP.schema.optional(MCP.schema.string({
      description: 'Optional name for the workflow in the generated code'
    })),
    includeComments: MCP.schema.optional(MCP.schema.boolean({
      description: 'Whether to include detailed comments in the generated code',
      default: true
    })),
    includeImports: MCP.schema.optional(MCP.schema.boolean({
      description: 'Whether to include import statements in code output',
      default: true
    }))
  }),

  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    try {
      const input: WorkflowCodeConverterInput = {
        workflow: req.body.workflow,
        targetFormat: req.body.targetFormat as WorkflowCodeConverterInput['targetFormat'],
        workflowName: req.body.workflowName,
        includeComments: req.body.includeComments,
        includeImports: req.body.includeImports
      };
      
      const result = convertWorkflow(input);
      
      return {
        body: result
      };
    } catch (error) {
      return {
        error: {
          message: (error as Error).message
        }
      };
    }
  }
}; 