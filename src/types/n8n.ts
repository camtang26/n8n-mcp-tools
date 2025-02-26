/**
 * Type definitions for n8n workflows and related entities
 */

/**
 * Represents a position in the n8n workflow editor
 */
export type Position = [number, number];

/**
 * Represents an n8n node in a workflow
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: Position;
  typeVersion: number;
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  disabled?: boolean;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  notes?: string;
}

/**
 * Connection between nodes
 */
export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

/**
 * Connections structure in a workflow
 */
export interface N8nConnections {
  main: Array<N8nConnection[]>;
  [key: string]: any;
}

/**
 * Represents an n8n workflow
 */
export interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: {
    main: Array<N8nConnection[]>;
    [key: string]: any;
  };
  settings?: {
    executionOrder?: string;
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
    saveDataErrorExecution?: string;
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
 * Represents a workflow execution
 */
export interface N8nExecution {
  id?: string;
  finished?: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: 'running' | 'waiting' | 'error' | 'success' | 'crashed';
  data: {
    resultData?: {
      runData?: Record<string, any[]>;
      error?: {
        message: string;
        stack?: string;
        node?: string;
      };
    };
    executionData?: {
      contextData?: Record<string, any>;
      nodeExecutionStack?: any[];
      waitingExecution?: Record<string, any>;
    };
    workflowData: N8nWorkflow;
  };
}

/**
 * Represents an n8n workflow template
 */
export interface N8nTemplate {
  id: string;
  name: string;
  description?: string;
  workflow: N8nWorkflow;
  categories?: string[];
  createdAt?: string;
}

/**
 * Represents an n8n credential
 */
export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
} 