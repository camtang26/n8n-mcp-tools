/**
 * Type definitions for @modelcontextprotocol/sdk
 */

declare module '@modelcontextprotocol/sdk' {
  /**
   * Manifest definition for the MCP server
   */
  export interface Manifest {
    version: string;
    name: string;
    description: string;
    tools: Tool[];
  }

  /**
   * Definition of a tool in the MCP manifest
   */
  export interface Tool {
    name: string;
    description: string;
    input_schema: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }

  /**
   * Parameters for executing a tool
   */
  export interface ExecuteParams {
    tool: string;
    input: any;
  }

  /**
   * Result of executing a tool
   */
  export interface ExecuteResult {
    data?: any;
    error?: {
      message: string;
      details?: any;
      stack?: string;
    };
  }

  /**
   * MCP Request object
   */
  export interface MCPRequest {
    body: any;
    toolName: string;
    [key: string]: any;
  }

  /**
   * MCP Response object
   */
  export interface MCPResponse {
    body?: any;
    error?: {
      message: string;
      details?: any;
      stack?: string;
    };
  }

  /**
   * MCP Tool handler interface
   */
  export interface MCP {
    name: string;
    handler: (request: MCPRequest) => Promise<MCPResponse>;
  }

  /**
   * Schema function types
   */
  export namespace MCP {
    export const schema: {
      object: (options: any) => any;
      string: (options?: any) => any;
      number: (options?: any) => any;
      boolean: (options?: any) => any;
      array: (options?: any) => any;
      optional: (schema: any) => any;
    };
  }

  /**
   * Options for creating an MCP server
   */
  export interface CreateServerOptions {
    manifest: Manifest;
    execute: (params: ExecuteParams) => Promise<ExecuteResult>;
    transport?: 'stdio' | 'http' | 'sse';
  }

  /**
   * MCP Server interface
   */
  export interface MCPServer {
    listen: (options?: { port?: number }) => void;
  }

  /**
   * Creates an MCP server
   */
  export function createServer(options: CreateServerOptions): MCPServer;
} 