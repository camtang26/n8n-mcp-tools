/**
 * Node Definitions for n8n Workflow Generator
 * 
 * This file contains definitions of common n8n nodes with their default parameters
 * to be used by the workflow generator.
 */

import { N8nNode, Position } from '../../schemas/n8nSchemas';

/**
 * Node type definition with required parameters and defaults
 */
export interface NodeDefinition {
  type: string;
  typeVersion: number;
  description: string;
  defaultName: string;
  defaultParameters: Record<string, any>;
  category: NodeCategory;
  inputs: string[];
  outputs: string[];
  requiredParameters?: string[];
  parameterDescriptions?: Record<string, string>;
}

/**
 * Node categories to organize nodes
 */
export type NodeCategory = 
  | 'trigger'
  | 'action'
  | 'data'
  | 'flow'
  | 'helper'
  | 'communication'
  | 'services'
  | 'analytics';

/**
 * Creates a node with the given parameters
 */
export function createNode(
  definition: NodeDefinition, 
  id: string,
  position: Position, 
  customParameters: Record<string, any> = {}, 
  customName?: string
): N8nNode {
  return {
    id,
    name: customName || definition.defaultName,
    type: definition.type,
    typeVersion: definition.typeVersion,
    position,
    parameters: {
      ...definition.defaultParameters,
      ...customParameters
    }
  };
}

/**
 * Create a unique node ID
 */
export function createNodeId(type: string, index: number): string {
  const cleanType = type.replace('n8n-nodes-base.', '');
  return `${cleanType}_${index}`;
}

/**
 * Common node definitions
 */
export const nodeDefinitions: Record<string, NodeDefinition> = {
  // Trigger Nodes
  'n8n-nodes-base.start': {
    type: 'n8n-nodes-base.start',
    typeVersion: 1,
    description: 'Start node that triggers a workflow execution',
    defaultName: 'Start',
    defaultParameters: {},
    category: 'trigger',
    inputs: [],
    outputs: ['main'],
  },
  'n8n-nodes-base.manualTrigger': {
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    description: 'Trigger for manually starting a workflow',
    defaultName: 'Manual Trigger',
    defaultParameters: {},
    category: 'trigger',
    inputs: [],
    outputs: ['main'],
  },
  'n8n-nodes-base.scheduleTrigger': {
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1,
    description: 'Trigger workflows at specific times or intervals',
    defaultName: 'Schedule Trigger',
    defaultParameters: {
      interval: [{
        field: 'cronExpression',
        expression: '0 0 * * *' // Daily at midnight
      }]
    },
    category: 'trigger',
    inputs: [],
    outputs: ['main'],
    requiredParameters: ['interval'],
    parameterDescriptions: {
      'interval': 'Schedule interval using CRON expression'
    }
  },
  'n8n-nodes-base.httpRequest': {
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 1,
    description: 'Make HTTP requests to any API endpoint',
    defaultName: 'HTTP Request',
    defaultParameters: {
      url: '',
      method: 'GET',
      authentication: 'none',
      options: {}
    },
    category: 'action',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['url', 'method'],
    parameterDescriptions: {
      'url': 'The URL to make the request to',
      'method': 'HTTP method to use (GET, POST, PUT, etc.)',
      'authentication': 'Authentication method',
      'options': 'Additional HTTP options (headers, query params, etc.)'
    }
  },
  'n8n-nodes-base.set': {
    type: 'n8n-nodes-base.set',
    typeVersion: 1,
    description: 'Set/add values to items and create new ones',
    defaultName: 'Set',
    defaultParameters: {
      values: {
        string: []
      },
      options: {}
    },
    category: 'data',
    inputs: ['main'],
    outputs: ['main'],
    parameterDescriptions: {
      'values': 'The values to set',
      'options': 'Additional options'
    }
  },
  'n8n-nodes-base.function': {
    type: 'n8n-nodes-base.function',
    typeVersion: 1,
    description: 'Run custom JavaScript code',
    defaultName: 'Function',
    defaultParameters: {
      functionCode: 'return items;'
    },
    category: 'helper',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['functionCode'],
    parameterDescriptions: {
      'functionCode': 'JavaScript code to execute for each item'
    }
  },
  'n8n-nodes-base.if': {
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    description: 'Split a workflow conditionally',
    defaultName: 'IF',
    defaultParameters: {
      conditions: {
        string: [
          {
            value1: '',
            operation: 'equal',
            value2: ''
          }
        ]
      }
    },
    category: 'flow',
    inputs: ['main'],
    outputs: ['main', 'main'],
    requiredParameters: ['conditions'],
    parameterDescriptions: {
      'conditions': 'Conditions to evaluate'
    }
  },
  'n8n-nodes-base.merge': {
    type: 'n8n-nodes-base.merge',
    typeVersion: 2,
    description: 'Merge data of multiple streams',
    defaultName: 'Merge',
    defaultParameters: {
      mode: 'append'
    },
    category: 'flow',
    inputs: ['main', 'main'],
    outputs: ['main'],
    parameterDescriptions: {
      'mode': 'How to merge the data (append, keepKeyMatches, etc.)'
    }
  },
  'n8n-nodes-base.email': {
    type: 'n8n-nodes-base.email',
    typeVersion: 1,
    description: 'Send emails',
    defaultName: 'Email',
    defaultParameters: {
      fromEmail: '',
      toEmail: '',
      subject: '',
      text: '',
      options: {}
    },
    category: 'communication',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['fromEmail', 'toEmail', 'subject'],
    parameterDescriptions: {
      'fromEmail': 'Sender email address',
      'toEmail': 'Recipient email address',
      'subject': 'Email subject',
      'text': 'Email body text',
      'options': 'Additional email options'
    }
  },
  'n8n-nodes-base.googleSheets': {
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 1,
    description: 'Read/write data to Google Sheets',
    defaultName: 'Google Sheets',
    defaultParameters: {
      operation: 'read',
      sheetId: '',
      range: '',
      options: {}
    },
    category: 'services',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['operation', 'sheetId'],
    parameterDescriptions: {
      'operation': 'Operation to perform (read/write)',
      'sheetId': 'ID of the Google Sheet',
      'range': 'Cell range to read/write',
      'options': 'Additional options'
    }
  },
  'n8n-nodes-base.twitter': {
    type: 'n8n-nodes-base.twitter',
    typeVersion: 1,
    description: 'Post tweets, search tweets, etc.',
    defaultName: 'Twitter',
    defaultParameters: {
      operation: 'search',
      searchText: '',
      options: {}
    },
    category: 'services',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['operation'],
    parameterDescriptions: {
      'operation': 'Operation to perform (search, post, etc.)',
      'searchText': 'Text to search for',
      'options': 'Additional options'
    }
  },
  'n8n-nodes-base.reddit': {
    type: 'n8n-nodes-base.reddit',
    typeVersion: 1,
    description: 'Get data from Reddit',
    defaultName: 'Reddit',
    defaultParameters: {
      operation: 'search',
      subreddit: '',
      options: {}
    },
    category: 'services',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['operation', 'subreddit'],
    parameterDescriptions: {
      'operation': 'Operation to perform (search, get posts, etc.)',
      'subreddit': 'Subreddit to search in',
      'options': 'Additional options'
    }
  },
  'n8n-nodes-base.slack': {
    type: 'n8n-nodes-base.slack',
    typeVersion: 1,
    description: 'Send messages to Slack',
    defaultName: 'Slack',
    defaultParameters: {
      operation: 'sendMessage',
      channel: '',
      text: '',
      options: {}
    },
    category: 'communication',
    inputs: ['main'],
    outputs: ['main'],
    requiredParameters: ['operation', 'channel', 'text'],
    parameterDescriptions: {
      'operation': 'Operation to perform (sendMessage, etc.)',
      'channel': 'Channel to send message to',
      'text': 'Message text',
      'options': 'Additional options'
    }
  }
}; 