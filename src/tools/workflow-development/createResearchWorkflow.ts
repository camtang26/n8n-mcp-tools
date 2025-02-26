import { ExecuteResult } from '@modelcontextprotocol/sdk';
import { n8nApi } from '../../api/n8nApi';
import { generateResearchWorkflowTemplate } from '../../templates/researchWorkflow';

interface CreateResearchWorkflowInput {
  name: string;
  description: string;
  research_sources?: string[];
}

/**
 * Create a specialized research workflow with proper node configuration
 */
export async function createResearchWorkflow(input: any): Promise<ExecuteResult> {
  try {
    const { name, description, research_sources = ['google'] } = input as CreateResearchWorkflowInput;
    
    if (!name || !description) {
      return {
        error: {
          message: 'Workflow name and description are required'
        }
      };
    }
    
    // Generate a research workflow template based on the input
    const workflowData = generateResearchWorkflowTemplate({
      name,
      description,
      researchSources: research_sources
    });
    
    // Create the workflow in n8n
    const workflow = await n8nApi.createWorkflow(workflowData);
    
    return {
      data: {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          active: workflow.active,
          nodes: workflow.nodes.map((node: any) => ({
            name: node.name,
            type: node.type
          })),
          researchSources: research_sources,
          message: 'Research workflow created successfully'
        }
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to create research workflow: ${error.message}`
      }
    };
  }
} 