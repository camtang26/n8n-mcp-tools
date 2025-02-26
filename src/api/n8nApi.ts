import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Define interfaces for n8n API responses
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: string;
  data: any;
  [key: string]: any;
}

export interface N8nTemplate {
  id: string;
  name: string;
  description: string;
  category: string[];
  [key: string]: any;
}

class N8nApiClient {
  private api: AxiosInstance;
  
  constructor() {
    const apiUrl = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    const apiKey = process.env.N8N_API_KEY;
    
    if (!apiKey) {
      console.warn('Warning: N8N_API_KEY environment variable is not set');
    }
    
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-N8N-API-KEY': apiKey } : {})
      }
    });
  }
  
  // Workflow Management API methods
  
  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.api.get('/workflows');
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get workflows: ${error.message}`);
    }
  }
  
  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    try {
      const response = await this.api.get(`/workflows/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: any): Promise<N8nWorkflow> {
    try {
      const response = await this.api.post('/workflows', workflow);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }
  
  /**
   * Update an existing workflow
   */
  async updateWorkflow(id: string, workflow: any): Promise<N8nWorkflow> {
    try {
      const response = await this.api.put(`/workflows/${id}`, workflow);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * Activate or deactivate a workflow
   */
  async setWorkflowActive(id: string, active: boolean): Promise<N8nWorkflow> {
    try {
      const response = await this.api.post(`/workflows/${id}/${active ? 'activate' : 'deactivate'}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to ${active ? 'activate' : 'deactivate'} workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.api.delete(`/workflows/${id}`);
    } catch (error: any) {
      throw new Error(`Failed to delete workflow ${id}: ${error.message}`);
    }
  }
  
  // Execution API methods
  
  /**
   * Execute a workflow
   */
  async executeWorkflow(id: string, data?: any): Promise<N8nExecution> {
    try {
      const response = await this.api.post(`/workflows/${id}/execute`, data || {});
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to execute workflow ${id}: ${error.message}`);
    }
  }
  
  /**
   * Get executions for a workflow
   */
  async getExecutions(workflowId: string, limit = 20): Promise<N8nExecution[]> {
    try {
      const response = await this.api.get(`/executions`, {
        params: {
          workflowId,
          limit
        }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get executions for workflow ${workflowId}: ${error.message}`);
    }
  }
  
  /**
   * Get a specific execution
   */
  async getExecution(id: string): Promise<N8nExecution> {
    try {
      const response = await this.api.get(`/executions/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get execution ${id}: ${error.message}`);
    }
  }
  
  // Template API methods (these might need to be customized for your specific template structure)
  
  /**
   * Get available templates
   */
  async getTemplates(): Promise<N8nTemplate[]> {
    try {
      // This endpoint might differ based on how you structure your templates
      const response = await this.api.get('/templates');
      return response.data.data;
    } catch (error: any) {
      // If templates are not supported in your n8n instance, return mock data
      console.warn(`Templates API not available: ${error.message}`);
      return [];
    }
  }

  // Additional methods needed for n8nApi.ts
  async getLogs(workflowId?: string, limit = 20): Promise<any[]> {
    try {
      const params: any = { limit };
      if (workflowId) params.workflowId = workflowId;
      const response = await this.api.get('/executions', { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }
  }

  async executeWorkflowWithData(id: string, data: any): Promise<any> {
    try {
      const response = await this.api.post(`/workflows/${id}/execute`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to execute workflow with data: ${error.message}`);
    }
  }
}

// Export a singleton instance of the API client
export const n8nApi = new N8nApiClient(); 