import { ExecuteResult } from '../../utils/mockSdk';
import { n8nApi, N8nWorkflow } from '../../api/n8nApi';

interface ListWorkflowsInput {
  filter?: string;
}

/**
 * List all existing workflows with their activation status
 */
export async function listWorkflows(input: any): Promise<ExecuteResult> {
  try {
    const { filter } = input as ListWorkflowsInput;
    
    // Get all workflows from n8n
    const workflows = await n8nApi.getWorkflows();
    
    // Apply filtering if specified
    let filteredWorkflows: N8nWorkflow[] = workflows;
    
    if (filter) {
      if (filter.toLowerCase() === 'active') {
        filteredWorkflows = workflows.filter(workflow => workflow.active);
      } else if (filter.toLowerCase() === 'inactive') {
        filteredWorkflows = workflows.filter(workflow => !workflow.active);
      } else if (filter.startsWith('tag:')) {
        const tag = filter.substring(4).toLowerCase();
        filteredWorkflows = workflows.filter(workflow => {
          const tags = workflow.tags || [];
          return tags.some((t: any) => 
            typeof t === 'string' 
              ? t.toLowerCase().includes(tag)
              : t.name.toLowerCase().includes(tag)
          );
        });
      } else {
        // Filter by name
        filteredWorkflows = workflows.filter(workflow => 
          workflow.name.toLowerCase().includes(filter.toLowerCase())
        );
      }
    }
    
    // Simplify the response to include just the essential information
    const result = filteredWorkflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      nodeCount: workflow.nodes?.length || 0
    }));
    
    return {
      data: {
        workflows: result,
        count: result.length,
        totalCount: workflows.length
      }
    };
  } catch (error: any) {
    return {
      error: {
        message: `Failed to list workflows: ${error.message}`
      }
    };
  }
} 