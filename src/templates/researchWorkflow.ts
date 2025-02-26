interface ResearchWorkflowParams {
  name: string;
  description: string;
  researchSources: string[];
}

/**
 * Generates a research workflow template with configurable sources
 */
export function generateResearchWorkflowTemplate(params: ResearchWorkflowParams): any {
  const { name, description, researchSources } = params;
  
  // Base workflow structure
  const workflow = {
    name,
    nodes: [] as any[],
    connections: { main: {} },
    active: false,
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true,
      callerPolicy: 'workflowsFromSameOwner'
    },
    tags: ['research', 'automated'],
    pinData: {},
    staticData: null,
    description
  };
  
  // Start node (always needed)
  const startNode = {
    parameters: {},
    name: 'Start',
    type: 'n8n-nodes-base.start',
    typeVersion: 1,
    position: [240, 300]
  };
  
  workflow.nodes.push(startNode);
  
  let lastNodePosition = [460, 300];
  let lastNodeName = 'Start';
  let nodeIndex = 1;
  
  // Add nodes for each research source
  for (const source of researchSources) {
    let sourceNode: any;
    
    switch (source.toLowerCase()) {
      case 'google':
        sourceNode = createGoogleSearchNode(nodeIndex, lastNodePosition);
        break;
      case 'twitter':
      case 'x':
        sourceNode = createTwitterSearchNode(nodeIndex, lastNodePosition);
        break;
      case 'reddit':
        sourceNode = createRedditSearchNode(nodeIndex, lastNodePosition);
        break;
      default:
        sourceNode = createGenericHttpNode(nodeIndex, source, lastNodePosition);
    }
    
    workflow.nodes.push(sourceNode);
    
    // Initialize connections for source node if needed
    if (!workflow.connections.main[lastNodeName]) {
      workflow.connections.main[lastNodeName] = {
        main: []
      };
    }
    
    // Connect to previous node
    workflow.connections.main[lastNodeName].main.push({
      node: sourceNode.name,
      type: 'main',
      index: 0
    });
    
    lastNodeName = sourceNode.name;
    lastNodePosition = [lastNodePosition[0] + 220, lastNodePosition[1]];
    nodeIndex++;
  }
  
  // Add processing node
  const processingNode = {
    parameters: {
      functionCode: 'return [\n  {\n    json: {\n      combinedResults: items.reduce((results, item) => {\n        // Extract data from different sources and combine\n        const sourceData = item.json.data || item.json.results || item.json;\n        results.push({\n          source: item.json.source || "unknown",\n          data: sourceData\n        });\n        return results;\n      }, [])\n    }\n  }\n];'
    },
    name: 'Process Research Results',
    type: 'n8n-nodes-base.function',
    typeVersion: 1,
    position: [lastNodePosition[0], lastNodePosition[1]]
  };
  
  workflow.nodes.push(processingNode);
  
  // Initialize connections for last node if needed
  if (!workflow.connections.main[lastNodeName]) {
    workflow.connections.main[lastNodeName] = {
      main: []
    };
  }
  
  // Connect processing node
  workflow.connections.main[lastNodeName].main.push({
    node: processingNode.name,
    type: 'main',
    index: 0
  });
  
  // Add summary node
  const summaryNode = {
    parameters: {
      functionCode: 'return [\n  {\n    json: {\n      researchSummary: `Research results from ${items[0].json.combinedResults.length} sources.\\n\\n` +\n        items[0].json.combinedResults.map(result => {\n          return `## ${result.source}\\n${JSON.stringify(result.data, null, 2)}`;\n        }).join("\\n\\n")\n    }\n  }\n];'
    },
    name: 'Generate Summary',
    type: 'n8n-nodes-base.function',
    typeVersion: 1,
    position: [lastNodePosition[0] + 220, lastNodePosition[1]]
  };
  
  workflow.nodes.push(summaryNode);
  
  // Initialize connections for processing node if needed
  if (!workflow.connections.main[processingNode.name]) {
    workflow.connections.main[processingNode.name] = {
      main: []
    };
  }
  
  // Connect summary node
  workflow.connections.main[processingNode.name].main.push({
    node: summaryNode.name,
    type: 'main',
    index: 0
  });
  
  return workflow;
}

// Helper functions to create different node types

function createGoogleSearchNode(index: number, position: number[]): any {
  return {
    parameters: {
      q: '={{ $workflow.name }}',
      limit: 10,
      returnAll: true
    },
    name: `Google Search`,
    type: 'n8n-nodes-base.googleSearch',
    typeVersion: 1,
    position: position,
    webhookId: `google-${index}`
  };
}

function createTwitterSearchNode(index: number, position: number[]): any {
  return {
    parameters: {
      searchText: '={{ $workflow.name }}',
      limit: 50,
      additionalFields: {
        includeEntities: true,
        tweetMode: 'extended'
      }
    },
    name: `Twitter Search`,
    type: 'n8n-nodes-base.twitter',
    typeVersion: 1,
    position: position,
    webhookId: `twitter-${index}`
  };
}

function createRedditSearchNode(index: number, position: number[]): any {
  return {
    parameters: {
      operation: 'search',
      subreddit: 'all',
      searchType: 'posts',
      query: '={{ $workflow.name }}',
      limit: 50,
      returnAll: true
    },
    name: `Reddit Search`,
    type: 'n8n-nodes-base.reddit',
    typeVersion: 1,
    position: position,
    webhookId: `reddit-${index}`
  };
}

function createGenericHttpNode(index: number, source: string, position: number[]): any {
  return {
    parameters: {
      url: `https://api.example.com/${source}/search`,
      method: 'GET',
      qs: {
        query: '={{ $workflow.name }}',
        limit: 50
      },
      options: {
        timeout: 5000
      }
    },
    name: `${source.charAt(0).toUpperCase() + source.slice(1)} Search`,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 1,
    position: position,
    webhookId: `${source.toLowerCase()}-${index}`
  };
} 