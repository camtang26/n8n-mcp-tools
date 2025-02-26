/**
 * Stub implementation of MCP schema functionality
 * This provides runtime objects that match what we're using in the type definitions
 */

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