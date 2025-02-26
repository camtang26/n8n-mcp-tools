/**
 * Mock implementation of @modelcontextprotocol/sdk
 * This replaces the actual package which is having loading issues
 */

// Basic MCP types
export interface Manifest {
  version: string;
  name: string;
  description: string;
  tools: Tool[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ExecuteParams {
  tool: string;
  input: any;
}

export interface ExecuteResult {
  data?: any;
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
}

export interface MCPRequest {
  body: any;
  toolName: string;
  [key: string]: any;
}

export interface MCPResponse {
  body?: any;
  error?: {
    message: string;
    details?: any;
    stack?: string;
  };
}

export interface MCPServer {
  listen: (options?: { port?: number }) => void;
}

export interface CreateServerOptions {
  manifest: Manifest;
  execute: (params: ExecuteParams) => Promise<ExecuteResult>;
  transport?: 'stdio' | 'http' | 'sse';
}

// MCP Schema functions implementation
export const MCP = {
  schema: {
    object: (options: any) => options,
    string: (options?: any) => ({ type: 'string', ...options }),
    number: (options?: any) => ({ type: 'number', ...options }),
    boolean: (options?: any) => ({ type: 'boolean', ...options }),
    array: (options?: any) => ({ type: 'array', ...options }),
    optional: (schema: any) => ({ ...schema, required: false }),
    union: (schemas: any[]) => ({ oneOf: schemas })
  }
};

// Mock implementation of createServer
export function createServer(options: CreateServerOptions): MCPServer {
  console.log(`n8n MCP server initialized with ${options.manifest.tools.length} tools`);
  
  // Simple implementation that just logs to console and returns a server object
  const server: MCPServer = {
    listen: (listenOptions?: { port?: number }) => {
      const port = listenOptions?.port || 3000;
      const transport = options.transport || 'stdio';
      
      console.log(`n8n MCP server started with ${transport} transport${
        transport !== 'stdio' ? ` on port ${port}` : ''
      }`);
      
      // If using stdio transport, set up basic handling
      if (transport === 'stdio') {
        process.stdin.on('data', async (data) => {
          try {
            const requestJson = data.toString().trim();
            if (!requestJson) return;
            
            const request = JSON.parse(requestJson);
            
            // Execute the requested tool
            const result = await options.execute({
              tool: request.toolName,
              input: request.body
            });
            
            // Send the response back
            process.stdout.write(JSON.stringify({ 
              id: request.id, 
              result 
            }) + '\n');
          } catch (error: any) {
            console.error('Error processing request:', error);
            process.stdout.write(JSON.stringify({ 
              error: { message: error.message } 
            }) + '\n');
          }
        });
        
        // Handle process exit
        process.on('exit', () => {
          console.log('MCP server shutting down');
        });
      }
    }
  };
  
  return server;
} 