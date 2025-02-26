import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';

interface ListTemplatesInput {
  category?: string;
}

/**
 * List available workflow templates
 */
export async function listTemplates(input: any): Promise<ExecuteResult> {
  try {
    const { category } = input as ListTemplatesInput;
    
    // In a real implementation, this would get templates from the n8n API
    // For now, we'll return some sample templates
    const templates = [
      {
        id: 'api-request',
        name: 'API Request',
        description: 'A template for making API requests and processing the responses',
        category: ['api', 'data'],
        nodeCount: 3
      },
      {
        id: 'social-media',
        name: 'Social Media Posting',
        description: 'Post content to various social media platforms',
        category: ['social', 'marketing'],
        nodeCount: 5
      },
      {
        id: 'data-processing',
        name: 'Data Processing Pipeline',
        description: 'Process and transform data from various sources',
        category: ['data', 'transformation'],
        nodeCount: 7
      },
      {
        id: 'notification',
        name: 'Notification System',
        description: 'Send notifications through multiple channels based on triggers',
        category: ['communication', 'automation'],
        nodeCount: 4
      }
    ];
    
    // Filter by category if provided
    let filteredTemplates = templates;
    if (category && category !== 'all') {
      filteredTemplates = templates.filter(template => 
        template.category.some(cat => cat.toLowerCase() === category.toLowerCase())
      );
    }
    
    return {
      data: {
        templates: filteredTemplates,
        count: filteredTemplates.length,
        total: templates.length,
        categories: ['api', 'data', 'social', 'marketing', 'transformation', 'communication', 'automation']
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to list templates: ${error.message}`
      }
    };
  }
} 