/**
 * n8n Schemas
 * 
 * This file defines TypeScript interfaces for n8n workflows, nodes, connections, 
 * and other related types to enhance type safety throughout the application.
 */

/**
 * Represents a position in the n8n workflow editor.
 */
export type Position = [number, number];

/**
 * Represents an n8n node in a workflow.
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: Position;
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

/**
 * Represents a connection between nodes in an n8n workflow.
 */
export interface N8nConnection {
  node: string;       // Target node ID
  type: string;       // Connection type on target (usually 'main')
  index: number;      // Index on target
  sourceNode?: string; // Source node ID (optional for backward compatibility)
}

/**
 * Represents the connections structure in an n8n workflow.
 */
export interface N8nConnections {
  main: {
    [sourceNodeId: string]: {
      [connectionType: string]: N8nConnection[];
    };
  };
}

/**
 * Represents an n8n workflow.
 */
export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active: boolean;
  settings?: {
    executionOrder?: string;
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
    callerPolicy?: 'workflowsFromSameOwner' | 'workflowsFromAnyOwner' | 'none';
    saveDataErrorExecution?: 'all' | 'none';
    timezone?: string;
    errorWorkflow?: string;
  };
  tags?: string[];
  pinData?: Record<string, any>;
  staticData?: any;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Represents an execution of an n8n workflow.
 */
export interface N8nExecution {
  id?: string;
  data: {
    resultData: {
      runData: Record<string, any[]>;
    };
    executionData?: {
      contextData?: Record<string, any>;
      nodeExecutionStack?: any[];
      waitingExecution?: Record<string, any>;
      waitingExecutionSource?: any;
    };
    workflowData: {
      id?: string;
      name: string;
      active: boolean;
      createdAt: string;
      updatedAt: string;
      nodes: N8nNode[];
      connections: N8nConnections;
    };
  };
  finished?: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'error';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  waitTill?: string;
  status: 'running' | 'success' | 'error' | 'crashed' | 'waiting';
}

/**
 * Represents an n8n workflow template.
 */
export interface N8nTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string[];
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: Record<string, any>;
  metadata?: {
    templateCreator?: string;
    templateDescription?: string;
    templateName?: string;
    templateType?: string;
    templateUrl?: string;
    templateVersion?: number;
  };
}

/**
 * Error type for common n8n errors
 */
export interface N8nError {
  message: string;
  description?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  timestamp?: string;
  executionId?: string;
  workflowId?: string;
  type: 'node' | 'workflow' | 'credential' | 'authentication' | 'rate-limit' | 'network' | 'unknown';
} 