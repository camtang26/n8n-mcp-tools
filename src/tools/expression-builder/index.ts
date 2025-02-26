/**
 * n8n Expression Builder Tool
 * 
 * This tool helps users create and understand n8n expressions
 * for accessing and manipulating data within workflows.
 */

import { MCP, MCPRequest, MCPResponse } from '@modelcontextprotocol/sdk';
import { expressionTemplates, ExpressionTemplate, ExpressionCategory } from './expressionTemplates';

/**
 * Input for the expression builder
 */
export interface ExpressionBuilderInput {
  /** Description of what the user wants to achieve with the expression */
  description: string;
  /** Optional category to filter expressions by */
  category?: ExpressionCategory;
  /** Optional sample data to test expressions against */
  sampleData?: Record<string, any>;
  /** Optional context about the workflow (previous nodes, etc.) */
  workflowContext?: {
    previousNodes?: string[];
    currentNodeType?: string;
    dataStructure?: Record<string, any>;
  };
}

/**
 * Output from the expression builder
 */
export interface ExpressionBuilderOutput {
  /** The recommended expression */
  expression: string;
  /** Explanation of how the expression works */
  explanation: string;
  /** How to use the expression in n8n */
  usage: string;
  /** If sample data was provided, the result of applying the expression */
  sampleResult?: any;
  /** Alternative expressions that could also work */
  alternatives?: Array<{
    expression: string;
    explanation: string;
  }>;
  /** Related expressions that might be useful */
  relatedExpressions?: Array<{
    name: string;
    description: string;
    expression: string;
  }>;
}

/**
 * Find relevant expression templates based on the user's description
 */
function findRelevantTemplates(
  description: string,
  category?: ExpressionCategory
): ExpressionTemplate[] {
  // Filter by category if provided
  const filteredByCategory = category 
    ? expressionTemplates.filter(template => template.category === category)
    : expressionTemplates;

  // Keywords to look for in the description
  const keywords: Record<string, string[]> = {
    'data-access': ['access', 'get', 'retrieve', 'field', 'property', 'value', 'json', 'item', 'data', 'node'],
    'string-manipulation': ['string', 'text', 'concat', 'combine', 'uppercase', 'lowercase', 'format', 'replace', 'trim', 'substring'],
    'date-time': ['date', 'time', 'format', 'timestamp', 'today', 'now', 'days', 'hours', 'minutes', 'seconds'],
    'number-math': ['number', 'math', 'calculate', 'add', 'subtract', 'multiply', 'divide', 'sum', 'total', 'round', 'format'],
    'array-manipulation': ['array', 'list', 'items', 'map', 'filter', 'find', 'join', 'combine', 'each', 'every', 'some'],
    'object-manipulation': ['object', 'properties', 'keys', 'values', 'merge', 'combine', 'pick', 'select', 'extract'],
    'conditional': ['condition', 'if', 'then', 'else', 'check', 'exists', 'empty', 'null', 'undefined', 'default', 'fallback']
  };

  // Score templates based on keyword matches in description
  const scoredTemplates = filteredByCategory.map(template => {
    let score = 0;
    const lowerDesc = description.toLowerCase();
    
    // Score based on category keywords
    const categoryKeywords = keywords[template.category] || [];
    categoryKeywords.forEach(keyword => {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
    
    // Score based on template name and description
    if (lowerDesc.includes(template.name.toLowerCase())) score += 5;
    
    const templateDesc = template.description.toLowerCase();
    const descWords = templateDesc.split(' ');
    descWords.forEach(word => {
      if (word.length > 3 && lowerDesc.includes(word)) {
        score += 1;
      }
    });
    
    return { template, score };
  });
  
  // Sort by score and return top matches
  const sortedTemplates = scoredTemplates
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 0)
    .map(item => item.template);
  
  return sortedTemplates.length > 0 ? sortedTemplates : filteredByCategory.slice(0, 3);
}

/**
 * Generate a customized expression based on the template and user description
 */
function customizeExpression(
  template: ExpressionTemplate,
  description: string,
  sampleData?: Record<string, any>,
  workflowContext?: ExpressionBuilderInput['workflowContext']
): string {
  let expression = template.expression;
  
  // Replace placeholders with appropriate values based on the context
  for (const [placeholder, info] of Object.entries(template.placeholders)) {
    const placeholderPattern = new RegExp(`{{${placeholder}}}`, 'g');
    
    // Try to infer a good value for the placeholder from the description and context
    let replacementValue = inferPlaceholderValue(
      placeholder,
      info,
      description,
      sampleData,
      workflowContext
    );
    
    // Default to first example if no value was inferred
    if (!replacementValue && info.examples.length > 0) {
      replacementValue = info.examples[0];
    }
    
    if (replacementValue) {
      expression = expression.replace(placeholderPattern, replacementValue);
    }
  }
  
  return expression;
}

/**
 * Infer a good value for a placeholder based on context
 */
function inferPlaceholderValue(
  placeholderName: string,
  placeholderInfo: { description: string; examples: string[] },
  description: string,
  sampleData?: Record<string, any>,
  workflowContext?: ExpressionBuilderInput['workflowContext']
): string | undefined {
  const lowerDesc = description.toLowerCase();
  
  // Handle field names from sample data
  if (placeholderName.includes('field') && sampleData) {
    // Look for field names mentioned in the description
    for (const field of Object.keys(sampleData)) {
      if (lowerDesc.includes(field.toLowerCase())) {
        return field;
      }
    }
    
    // Default to first field from sample data
    return Object.keys(sampleData)[0];
  }
  
  // Handle array fields
  if (placeholderName.includes('array') && sampleData) {
    // Find array fields in the sample data
    for (const [key, value] of Object.entries(sampleData)) {
      if (Array.isArray(value) && lowerDesc.includes(key.toLowerCase())) {
        return `$json.${key}`;
      }
    }
    
    // Default to first array in sample data
    for (const [key, value] of Object.entries(sampleData)) {
      if (Array.isArray(value)) {
        return `$json.${key}`;
      }
    }
  }
  
  // Handle node names
  if (placeholderName.includes('node') && workflowContext?.previousNodes?.length) {
    // Look for node names mentioned in the description
    for (const node of workflowContext.previousNodes) {
      if (lowerDesc.includes(node.toLowerCase())) {
        return node;
      }
    }
    
    // Default to first previous node
    return workflowContext.previousNodes[0];
  }
  
  // Extract specific values mentioned in the description based on the placeholder type
  if (placeholderName.includes('value') || placeholderName.includes('field')) {
    const words = description.split(' ');
    
    // Look for quoted values
    const quotedRegex = /"([^"]+)"|'([^']+)'/g;
    let match;
    while ((match = quotedRegex.exec(description)) !== null) {
      const value = match[1] || match[2];
      return `"${value}"`;
    }
    
    // Look for words that match examples
    for (const example of placeholderInfo.examples) {
      const exampleWithoutPrefix = example.replace('$json.', '');
      for (const word of words) {
        if (
          word.toLowerCase() === exampleWithoutPrefix.toLowerCase() ||
          word.toLowerCase() === example.toLowerCase()
        ) {
          return example.startsWith('$') ? example : `$json.${word}`;
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Evaluate an expression with sample data to show the result
 */
function evaluateExpression(
  expression: string,
  sampleData: Record<string, any>
): any {
  try {
    // Extract the actual expression code from the n8n expression format
    // Example: "{{ $json.name }}" -> "$json.name"
    const expressionCode = expression.replace(/^{{|}}$/g, '').trim();
    
    // Create a context with the sample data for evaluation
    const context: Record<string, any> = {
      $json: sampleData,
      $now: new Date().toISOString()
    };
    
    // For node references, add mock data
    if (expressionCode.includes('$node[')) {
      context.$node = {};
      // Extract node names from the expression and add them to the context
      const nodeNameRegex = /\$node\["([^"]+)"\]/g;
      let nodeMatch;
      while ((nodeMatch = nodeNameRegex.exec(expressionCode)) !== null) {
        const nodeName = nodeMatch[1];
        context.$node[nodeName] = { json: { ...sampleData } };
      }
    }
    
    // Create and evaluate a function with the context
    const evaluator = new Function(...Object.keys(context), `return ${expressionCode}`);
    return evaluator(...Object.values(context));
  } catch (error) {
    return `Error evaluating expression: ${(error as Error).message}`;
  }
}

/**
 * Generate usage instructions for the expression
 */
function generateUsageInstructions(expression: string, template: ExpressionTemplate): string {
  const instructions = [
    `1. In your n8n workflow, select the node where you want to use this expression.`,
    `2. Find the field where you want to use the expression and click on the gears/settings icon next to it.`,
    `3. Select "Expression" from the dropdown menu.`,
    `4. Paste the following expression into the expression editor:`,
    `   ${expression}`,
    `5. Click "Save" to apply the expression.`
  ];
  
  if (template.category === 'node-reference') {
    instructions.push(
      `Note: This expression references a previous node. Make sure the node name "${
        expression.match(/\$node\["([^"]+)"\]/)?.[1] || 'referenced node'
      }" matches exactly with your node name in the workflow.`
    );
  }
  
  return instructions.join('\n');
}

/**
 * Find related expressions that might be useful with the primary expression
 */
function findRelatedExpressions(
  primaryTemplate: ExpressionTemplate,
  description: string
): Array<{ name: string; description: string; expression: string }> {
  // Find expressions in the same category
  const sameCategoryTemplates = expressionTemplates
    .filter(t => 
      t.category === primaryTemplate.category && 
      t.id !== primaryTemplate.id
    )
    .slice(0, 2);
    
  // Find expressions that might chain well with this one
  const chainableCategories: Record<ExpressionCategory, ExpressionCategory[]> = {
    'data-access': ['string-manipulation', 'array-manipulation', 'conditional'],
    'string-manipulation': ['conditional', 'data-access'],
    'date-time': ['string-manipulation', 'conditional'],
    'number-math': ['conditional', 'string-manipulation'],
    'array-manipulation': ['string-manipulation', 'conditional'],
    'object-manipulation': ['array-manipulation', 'conditional'],
    'conditional': ['data-access', 'string-manipulation'],
    'node-reference': ['data-access', 'string-manipulation']
  };
  
  const complementaryTemplates = chainableCategories[primaryTemplate.category]
    .flatMap(category => 
      expressionTemplates
        .filter(t => t.category === category)
        .slice(0, 1)
    );
  
  // Combine and format the related expressions
  return [...sameCategoryTemplates, ...complementaryTemplates]
    .slice(0, 3)
    .map(template => ({
      name: template.name,
      description: template.description,
      expression: template.examples[0]?.expression || template.expression
    }));
}

/**
 * Main function to generate expressions based on user requirements
 */
export function buildExpression(
  input: ExpressionBuilderInput
): ExpressionBuilderOutput {
  // Find relevant expression templates
  const relevantTemplates = findRelevantTemplates(
    input.description,
    input.category
  );
  
  if (relevantTemplates.length === 0) {
    throw new Error('No suitable expression templates found for your requirements.');
  }
  
  // Get the best matching template
  const primaryTemplate = relevantTemplates[0];
  
  // Generate a customized expression
  const expression = customizeExpression(
    primaryTemplate,
    input.description,
    input.sampleData,
    input.workflowContext
  );
  
  // Generate explanation
  const explanation = `This expression ${primaryTemplate.description.toLowerCase()}. ${
    Object.entries(primaryTemplate.placeholders).length > 0
      ? `It works by ${Object.entries(primaryTemplate.placeholders)
          .map(([name, info]) => `using ${info.description} (${name})`)
          .join(' and ')}.`
      : ''
  }`;
  
  // Generate usage instructions
  const usage = generateUsageInstructions(expression, primaryTemplate);
  
  // Evaluate with sample data if provided
  const sampleResult = input.sampleData
    ? evaluateExpression(expression, input.sampleData)
    : undefined;
  
  // Generate alternative expressions
  const alternatives = relevantTemplates
    .slice(1, 3)
    .map(template => {
      const altExpression = customizeExpression(
        template,
        input.description,
        input.sampleData,
        input.workflowContext
      );
      
      return {
        expression: altExpression,
        explanation: `Alternative approach that ${template.description.toLowerCase()}.`
      };
    });
  
  // Find related expressions
  const relatedExpressions = findRelatedExpressions(primaryTemplate, input.description);
  
  // Return the complete output
  return {
    expression,
    explanation,
    usage,
    sampleResult,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
    relatedExpressions: relatedExpressions.length > 0 ? relatedExpressions : undefined
  };
}

/**
 * MCP Tool handler for the Expression Builder
 */
export default {
  name: 'buildExpression',
  title: 'n8n Expression Builder',
  description: 'Build expressions for manipulating data in n8n workflows',
  schema: MCP.schema.object({
    description: MCP.schema.string({
      description: 'Description of what you want to achieve with the expression'
    }),
    category: MCP.schema.optional(MCP.schema.string({
      description: 'Optionally filter by expression category',
      enum: [
        'data-access',
        'string-manipulation',
        'date-time',
        'number-math',
        'array-manipulation',
        'object-manipulation',
        'conditional',
        'node-reference'
      ]
    })),
    sampleData: MCP.schema.optional(MCP.schema.object({
      description: 'Sample data to test the expression with'
    })),
    workflowContext: MCP.schema.optional(MCP.schema.object({
      previousNodes: MCP.schema.optional(MCP.schema.array(MCP.schema.string({
        description: 'Names of previous nodes in the workflow'
      }))),
      currentNodeType: MCP.schema.optional(MCP.schema.string({
        description: 'Type of the current node'
      })),
      dataStructure: MCP.schema.optional(MCP.schema.object({
        description: 'Structure of the data in the workflow'
      }))
    }))
  }),

  handler: async (req: MCPRequest): Promise<MCPResponse> => {
    try {
      const input: ExpressionBuilderInput = {
        description: req.body.description,
        category: req.body.category as ExpressionCategory | undefined,
        sampleData: req.body.sampleData,
        workflowContext: req.body.workflowContext
      };
      
      const result = buildExpression(input);
      
      return {
        body: result
      };
    } catch (error) {
      return {
        error: {
          message: (error as Error).message
        }
      };
    }
  }
}; 