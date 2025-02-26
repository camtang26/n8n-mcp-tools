/**
 * n8n Expression Templates
 * 
 * This file contains templates for common n8n expressions
 * that can be used to manipulate data in workflows.
 */

/**
 * Expression template with examples and explanations
 */
export interface ExpressionTemplate {
  id: string;
  name: string;
  description: string;
  expression: string;
  placeholders: Record<string, {
    description: string;
    examples: string[];
  }>;
  examples: Array<{
    description: string;
    expression: string;
    input?: any;
    output?: any;
  }>;
  category: ExpressionCategory;
}

/**
 * Categories to organize expression templates
 */
export type ExpressionCategory =
  | 'data-access'
  | 'string-manipulation'
  | 'date-time'
  | 'number-math'
  | 'array-manipulation'
  | 'object-manipulation'
  | 'conditional'
  | 'node-reference';

/**
 * Templates for accessing data
 */
export const dataAccessTemplates: ExpressionTemplate[] = [
  {
    id: 'data-access-json',
    name: 'Access JSON Data',
    description: 'Access data from the current item',
    expression: '{{ $json["{{field}}"] }}',
    placeholders: {
      field: {
        description: 'Field name to access',
        examples: ['name', 'email', 'user.id']
      }
    },
    examples: [
      {
        description: 'Access a top-level field',
        expression: '{{ $json["name"] }}',
        input: { name: 'John Doe', email: 'john@example.com' },
        output: 'John Doe'
      },
      {
        description: 'Access a nested field with dot notation',
        expression: '{{ $json["user.profile.name"] }}',
        input: { 'user.profile.name': 'John Doe' },
        output: 'John Doe'
      }
    ],
    category: 'data-access'
  },
  {
    id: 'data-access-nested',
    name: 'Access Nested Data',
    description: 'Access nested data from the current item using dot notation',
    expression: '{{ $json.{{parent}}.{{child}} }}',
    placeholders: {
      parent: {
        description: 'Parent field name',
        examples: ['user', 'data', 'metadata']
      },
      child: {
        description: 'Child field name',
        examples: ['id', 'name', 'value']
      }
    },
    examples: [
      {
        description: 'Access a nested user name',
        expression: '{{ $json.user.name }}',
        input: { user: { name: 'John Doe', email: 'john@example.com' } },
        output: 'John Doe'
      },
      {
        description: 'Access a deeply nested value',
        expression: '{{ $json.data.profile.preferences.theme }}',
        input: { data: { profile: { preferences: { theme: 'dark' } } } },
        output: 'dark'
      }
    ],
    category: 'data-access'
  },
  {
    id: 'data-access-node',
    name: 'Reference Previous Node Data',
    description: 'Access data from a previous node',
    expression: '{{ $node["{{nodeName}}"].json["{{field}}"] }}',
    placeholders: {
      nodeName: {
        description: 'Name of the node to reference',
        examples: ['HTTP Request', 'GitHub', 'Filter']
      },
      field: {
        description: 'Field name to access',
        examples: ['id', 'data', 'result']
      }
    },
    examples: [
      {
        description: 'Get an ID from HTTP Request node',
        expression: '{{ $node["HTTP Request"].json["id"] }}',
        output: '12345'
      },
      {
        description: 'Access nested data from a previous node',
        expression: '{{ $node["GitHub"].json.repository.full_name }}',
        output: 'n8n-io/n8n'
      }
    ],
    category: 'node-reference'
  },
  {
    id: 'data-access-first-item',
    name: 'Access First Item in List',
    description: 'Access the first item from a list in the current data',
    expression: '{{ $json.{{array}}[0].{{field}} }}',
    placeholders: {
      array: {
        description: 'Array field name',
        examples: ['items', 'results', 'data']
      },
      field: {
        description: 'Field name within array item',
        examples: ['id', 'name', 'value']
      }
    },
    examples: [
      {
        description: 'Get the first item name from a results array',
        expression: '{{ $json.results[0].name }}',
        input: { results: [{ name: 'First Item' }, { name: 'Second Item' }] },
        output: 'First Item'
      }
    ],
    category: 'data-access'
  }
];

/**
 * Templates for string manipulation
 */
export const stringTemplates: ExpressionTemplate[] = [
  {
    id: 'string-concat',
    name: 'Concatenate Strings',
    description: 'Join multiple strings together',
    expression: '{{ "{{prefix}}" + {{value}} + "{{suffix}}" }}',
    placeholders: {
      prefix: {
        description: 'Text to add before the value',
        examples: ['ID: ', 'Name: ', 'User ']
      },
      value: {
        description: 'Value to include (field reference or literal)',
        examples: ['$json.id', '$json.name', '"text"']
      },
      suffix: {
        description: 'Text to add after the value',
        examples: [' created', ' updated', ' (verified)']
      }
    },
    examples: [
      {
        description: 'Format a user record',
        expression: '{{ "User: " + $json.name + " (" + $json.email + ")" }}',
        input: { name: 'John Doe', email: 'john@example.com' },
        output: 'User: John Doe (john@example.com)'
      }
    ],
    category: 'string-manipulation'
  },
  {
    id: 'string-transform',
    name: 'Transform String Case',
    description: 'Change the case of a string',
    expression: '{{ {{value}}.{{transform}}() }}',
    placeholders: {
      value: {
        description: 'String value to transform',
        examples: ['$json.name', '$json.email', '"Some Text"']
      },
      transform: {
        description: 'Transformation to apply',
        examples: ['toUpperCase', 'toLowerCase', 'trim']
      }
    },
    examples: [
      {
        description: 'Convert a name to uppercase',
        expression: '{{ $json.name.toUpperCase() }}',
        input: { name: 'John Doe' },
        output: 'JOHN DOE'
      },
      {
        description: 'Trim whitespace from a string',
        expression: '{{ $json.input.trim() }}',
        input: { input: '  spaced  ' },
        output: 'spaced'
      }
    ],
    category: 'string-manipulation'
  },
  {
    id: 'string-substring',
    name: 'Extract Substring',
    description: 'Extract a portion of a string',
    expression: '{{ {{value}}.substring({{start}}, {{end}}) }}',
    placeholders: {
      value: {
        description: 'String to extract from',
        examples: ['$json.text', '$json.id', '"sample text"']
      },
      start: {
        description: 'Starting position (0-based)',
        examples: ['0', '5', '$json.startPos']
      },
      end: {
        description: 'Ending position (optional)',
        examples: ['8', '10', '$json.endPos']
      }
    },
    examples: [
      {
        description: 'Extract first 5 characters',
        expression: '{{ $json.text.substring(0, 5) }}',
        input: { text: 'Hello World' },
        output: 'Hello'
      }
    ],
    category: 'string-manipulation'
  },
  {
    id: 'string-replace',
    name: 'Replace Text',
    description: 'Replace part of a string with another string',
    expression: '{{ {{value}}.replace("{{search}}", "{{replace}}") }}',
    placeholders: {
      value: {
        description: 'String to perform replacement on',
        examples: ['$json.text', '$json.html', '"old text"']
      },
      search: {
        description: 'Text to search for',
        examples: ['old', 'error', 'http://']
      },
      replace: {
        description: 'Replacement text',
        examples: ['new', 'success', 'https://']
      }
    },
    examples: [
      {
        description: 'Replace http with https',
        expression: '{{ $json.url.replace("http://", "https://") }}',
        input: { url: 'http://example.com' },
        output: 'https://example.com'
      },
      {
        description: 'Replace all occurrences (using regex)',
        expression: '{{ $json.text.replace(/apple/g, "orange") }}',
        input: { text: 'I like apple and apple pie' },
        output: 'I like orange and orange pie'
      }
    ],
    category: 'string-manipulation'
  }
];

/**
 * Templates for date manipulation
 */
export const dateTemplates: ExpressionTemplate[] = [
  {
    id: 'date-format',
    name: 'Format Date',
    description: 'Format a date or timestamp',
    expression: '{{ new Date({{value}}).toISOString() }}',
    placeholders: {
      value: {
        description: 'Date value or timestamp',
        examples: ['$json.date', '$json.createdAt', 'Date.now()']
      }
    },
    examples: [
      {
        description: 'Format a timestamp to ISO string',
        expression: '{{ new Date($json.timestamp).toISOString() }}',
        input: { timestamp: 1609459200000 }, // January 1, 2021
        output: '2021-01-01T00:00:00.000Z'
      },
      {
        description: 'Format the current date and time',
        expression: '{{ new Date().toISOString() }}',
        output: '2023-01-15T12:30:45.123Z' // Example output
      }
    ],
    category: 'date-time'
  },
  {
    id: 'date-now',
    name: 'Current Date and Time',
    description: 'Get the current date and time',
    expression: '{{ $now }}',
    placeholders: {},
    examples: [
      {
        description: 'Get current ISO timestamp',
        expression: '{{ $now }}',
        output: '2023-01-15T12:30:45.123Z' // Example output
      },
      {
        description: 'Format the current date as YYYY-MM-DD',
        expression: '{{ $now.split("T")[0] }}',
        output: '2023-01-15' // Example output
      }
    ],
    category: 'date-time'
  },
  {
    id: 'date-add',
    name: 'Add Time to Date',
    description: 'Add days, hours, minutes to a date',
    expression: '{{ new Date(new Date({{date}}).getTime() + ({{amount}} * {{unit}})).toISOString() }}',
    placeholders: {
      date: {
        description: 'Starting date',
        examples: ['$json.date', '$now', '"2023-01-15"']
      },
      amount: {
        description: 'Amount to add',
        examples: ['1', '24', '60']
      },
      unit: {
        description: 'Time unit in milliseconds',
        examples: ['86400000 (day)', '3600000 (hour)', '60000 (minute)']
      }
    },
    examples: [
      {
        description: 'Add 2 days to a date',
        expression: '{{ new Date(new Date($json.date).getTime() + (2 * 86400000)).toISOString() }}',
        input: { date: '2023-01-15T00:00:00.000Z' },
        output: '2023-01-17T00:00:00.000Z'
      },
      {
        description: 'Add 30 minutes to current time',
        expression: '{{ new Date(new Date().getTime() + (30 * 60000)).toISOString() }}'
      }
    ],
    category: 'date-time'
  }
];

/**
 * Templates for number manipulation
 */
export const numberTemplates: ExpressionTemplate[] = [
  {
    id: 'number-basic-math',
    name: 'Basic Math Operations',
    description: 'Perform basic math calculations',
    expression: '{{ {{value1}} {{operator}} {{value2}} }}',
    placeholders: {
      value1: {
        description: 'First numeric value',
        examples: ['$json.price', '$json.quantity', '10']
      },
      operator: {
        description: 'Math operator',
        examples: ['+', '-', '*', '/']
      },
      value2: {
        description: 'Second numeric value',
        examples: ['$json.tax', '$json.discount', '2']
      }
    },
    examples: [
      {
        description: 'Calculate total price with tax',
        expression: '{{ $json.price * (1 + $json.taxRate) }}',
        input: { price: 100, taxRate: 0.2 },
        output: 120
      },
      {
        description: 'Calculate discounted price',
        expression: '{{ $json.price - ($json.price * $json.discount) }}',
        input: { price: 50, discount: 0.1 },
        output: 45
      }
    ],
    category: 'number-math'
  },
  {
    id: 'number-round',
    name: 'Round Number',
    description: 'Round a number to a specific precision',
    expression: '{{ Math.round({{value}} * Math.pow(10, {{decimals}})) / Math.pow(10, {{decimals}}) }}',
    placeholders: {
      value: {
        description: 'Numeric value to round',
        examples: ['$json.amount', '$json.price', '3.14159']
      },
      decimals: {
        description: 'Number of decimal places',
        examples: ['0', '2', '4']
      }
    },
    examples: [
      {
        description: 'Round to 2 decimal places',
        expression: '{{ Math.round($json.amount * 100) / 100 }}',
        input: { amount: 123.456 },
        output: 123.46
      },
      {
        description: 'Round to nearest integer',
        expression: '{{ Math.round($json.value) }}',
        input: { value: 7.8 },
        output: 8
      }
    ],
    category: 'number-math'
  },
  {
    id: 'number-format',
    name: 'Format Number',
    description: 'Format a number as currency or with specific notation',
    expression: '{{ Number({{value}}).toFixed({{decimals}}) }}',
    placeholders: {
      value: {
        description: 'Numeric value to format',
        examples: ['$json.amount', '$json.price', '1234.5678']
      },
      decimals: {
        description: 'Number of decimal places',
        examples: ['0', '2', '4']
      }
    },
    examples: [
      {
        description: 'Format as currency (2 decimals)',
        expression: '{{ Number($json.price).toFixed(2) }}',
        input: { price: 123.4567 },
        output: '123.46'
      },
      {
        description: 'Format large number with no decimals',
        expression: '{{ Number($json.total).toFixed(0) }}',
        input: { total: 1234.56 },
        output: '1235'
      }
    ],
    category: 'number-math'
  }
];

/**
 * Templates for array manipulation
 */
export const arrayTemplates: ExpressionTemplate[] = [
  {
    id: 'array-map',
    name: 'Map Array Values',
    description: 'Transform each item in an array',
    expression: '{{ {{array}}.map(item => item.{{field}}) }}',
    placeholders: {
      array: {
        description: 'Array to transform',
        examples: ['$json.items', '$json.results', '$node["HTTP Request"].json.data']
      },
      field: {
        description: 'Field to extract from each item',
        examples: ['id', 'name', 'value']
      }
    },
    examples: [
      {
        description: 'Extract all item names from an array',
        expression: '{{ $json.users.map(item => item.name) }}',
        input: { users: [{ name: 'Alice', id: 1 }, { name: 'Bob', id: 2 }] },
        output: ['Alice', 'Bob']
      },
      {
        description: 'Transform item structure',
        expression: '{{ $json.products.map(item => ({ id: item.id, name: item.title.toUpperCase() })) }}',
        input: { products: [{ id: 101, title: 'Book' }, { id: 102, title: 'Pen' }] },
        output: [{ id: 101, name: 'BOOK' }, { id: 102, name: 'PEN' }]
      }
    ],
    category: 'array-manipulation'
  },
  {
    id: 'array-filter',
    name: 'Filter Array',
    description: 'Filter items in an array based on a condition',
    expression: '{{ {{array}}.filter(item => item.{{field}} {{operator}} {{value}}) }}',
    placeholders: {
      array: {
        description: 'Array to filter',
        examples: ['$json.items', '$json.users', '$node["HTTP Request"].json.data']
      },
      field: {
        description: 'Field to check in each item',
        examples: ['active', 'age', 'price']
      },
      operator: {
        description: 'Comparison operator',
        examples: ['===', '>', '<=', '!==']
      },
      value: {
        description: 'Value to compare against',
        examples: ['true', '18', '100']
      }
    },
    examples: [
      {
        description: 'Find all active users',
        expression: '{{ $json.users.filter(item => item.active === true) }}',
        input: { users: [{ name: 'Alice', active: true }, { name: 'Bob', active: false }] },
        output: [{ name: 'Alice', active: true }]
      },
      {
        description: 'Find products over $100',
        expression: '{{ $json.products.filter(item => item.price > 100) }}',
        input: { products: [{ name: 'Basic', price: 50 }, { name: 'Premium', price: 150 }] },
        output: [{ name: 'Premium', price: 150 }]
      }
    ],
    category: 'array-manipulation'
  },
  {
    id: 'array-find',
    name: 'Find Item in Array',
    description: 'Find the first item in an array that matches a condition',
    expression: '{{ {{array}}.find(item => item.{{field}} === {{value}}) }}',
    placeholders: {
      array: {
        description: 'Array to search',
        examples: ['$json.items', '$json.users', '$node["HTTP Request"].json.data']
      },
      field: {
        description: 'Field to check in each item',
        examples: ['id', 'name', 'type']
      },
      value: {
        description: 'Value to find',
        examples: ['"admin"', '42', 'true']
      }
    },
    examples: [
      {
        description: 'Find user by ID',
        expression: '{{ $json.users.find(item => item.id === 2) }}',
        input: { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
        output: { id: 2, name: 'Bob' }
      },
      {
        description: 'Find item by name',
        expression: '{{ $json.items.find(item => item.name === "Target") }}',
        input: { items: [{ name: 'First', value: 1 }, { name: 'Target', value: 2 }] },
        output: { name: 'Target', value: 2 }
      }
    ],
    category: 'array-manipulation'
  },
  {
    id: 'array-join',
    name: 'Join Array Values',
    description: 'Combine array values into a single string',
    expression: '{{ {{array}}.join("{{separator}}") }}',
    placeholders: {
      array: {
        description: 'Array to join',
        examples: ['$json.tags', '$json.names', '$json.values']
      },
      separator: {
        description: 'Separator between values',
        examples: [', ', ' | ', '\\n']
      }
    },
    examples: [
      {
        description: 'Create comma-separated list',
        expression: '{{ $json.tags.join(", ") }}',
        input: { tags: ['node', 'api', 'automation'] },
        output: 'node, api, automation'
      },
      {
        description: 'Create line breaks between items',
        expression: '{{ $json.lines.join("\\n") }}',
        input: { lines: ['Line 1', 'Line 2', 'Line 3'] },
        output: 'Line 1\nLine 2\nLine 3'
      }
    ],
    category: 'array-manipulation'
  }
];

/**
 * Templates for object manipulation
 */
export const objectTemplates: ExpressionTemplate[] = [
  {
    id: 'object-keys',
    name: 'Get Object Keys',
    description: 'Get all keys from an object',
    expression: '{{ Object.keys({{object}}) }}',
    placeholders: {
      object: {
        description: 'Object to get keys from',
        examples: ['$json', '$json.data', '$json.user']
      }
    },
    examples: [
      {
        description: 'Get all field names',
        expression: '{{ Object.keys($json.user) }}',
        input: { user: { id: 1, name: 'Alice', email: 'alice@example.com' } },
        output: ['id', 'name', 'email']
      }
    ],
    category: 'object-manipulation'
  },
  {
    id: 'object-pick',
    name: 'Pick Object Properties',
    description: 'Create a new object with only selected properties',
    expression: '{{ { {{properties}} } }}',
    placeholders: {
      properties: {
        description: 'Properties to include in the new object',
        examples: ['id: $json.id, name: $json.name', 'title: $json.subject, body: $json.content']
      }
    },
    examples: [
      {
        description: 'Create user summary object',
        expression: '{{ { id: $json.user.id, name: $json.user.name } }}',
        input: { user: { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' } },
        output: { id: 1, name: 'Alice' }
      },
      {
        description: 'Rename fields',
        expression: '{{ { userId: $json.id, fullName: $json.name } }}',
        input: { id: 1, name: 'Alice' },
        output: { userId: 1, fullName: 'Alice' }
      }
    ],
    category: 'object-manipulation'
  },
  {
    id: 'object-merge',
    name: 'Merge Objects',
    description: 'Combine multiple objects into one',
    expression: '{{ {...{{object1}}, ...{{object2}}} }}',
    placeholders: {
      object1: {
        description: 'First object',
        examples: ['$json.user', '$json.profile', '$json.data']
      },
      object2: {
        description: 'Second object (properties override first object)',
        examples: ['$json.details', '$json.preferences', '$node["Previous"].json']
      }
    },
    examples: [
      {
        description: 'Merge user with preferences',
        expression: '{{ {...$json.user, ...$json.preferences} }}',
        input: { 
          user: { id: 1, name: 'Alice' }, 
          preferences: { theme: 'dark', notifications: true } 
        },
        output: { id: 1, name: 'Alice', theme: 'dark', notifications: true }
      },
      {
        description: 'Override properties',
        expression: '{{ {...$json.defaults, ...$json.custom} }}',
        input: { 
          defaults: { color: 'blue', size: 'medium', type: 'standard' }, 
          custom: { color: 'red' } 
        },
        output: { color: 'red', size: 'medium', type: 'standard' }
      }
    ],
    category: 'object-manipulation'
  }
];

/**
 * Templates for conditional expressions
 */
export const conditionalTemplates: ExpressionTemplate[] = [
  {
    id: 'conditional-ternary',
    name: 'Conditional (Ternary) Operator',
    description: 'Choose a value based on a condition',
    expression: '{{ {{condition}} ? {{trueValue}} : {{falseValue}} }}',
    placeholders: {
      condition: {
        description: 'Condition to evaluate',
        examples: ['$json.active === true', '$json.count > 0', '$json.status === "success"']
      },
      trueValue: {
        description: 'Value if condition is true',
        examples: ['"Active"', '$json.name', '1']
      },
      falseValue: {
        description: 'Value if condition is false',
        examples: ['"Inactive"', '"Not found"', '0']
      }
    },
    examples: [
      {
        description: 'Set status text based on state',
        expression: '{{ $json.active ? "Active" : "Inactive" }}',
        input: { active: true },
        output: 'Active'
      },
      {
        description: 'Return count or zero',
        expression: '{{ $json.items ? $json.items.length : 0 }}',
        input: { items: ['a', 'b', 'c'] },
        output: 3
      }
    ],
    category: 'conditional'
  },
  {
    id: 'conditional-default',
    name: 'Default Value (Nullish Coalescing)',
    description: 'Use a default value if the original is null or undefined',
    expression: '{{ {{value}} ?? {{defaultValue}} }}',
    placeholders: {
      value: {
        description: 'Primary value to use',
        examples: ['$json.name', '$json.email', '$json.count']
      },
      defaultValue: {
        description: 'Default value if primary is null/undefined',
        examples: ['"Unnamed"', '"email@example.com"', '0']
      }
    },
    examples: [
      {
        description: 'Use default name if not provided',
        expression: '{{ $json.name ?? "Anonymous" }}',
        input: { email: 'anon@example.com' }, // name is missing
        output: 'Anonymous'
      },
      {
        description: 'Use count or zero',
        expression: '{{ $json.count ?? 0 }}',
        input: {}, // count is missing
        output: 0
      }
    ],
    category: 'conditional'
  },
  {
    id: 'conditional-exists',
    name: 'Check if Value Exists',
    description: 'Check if a value exists (not null/undefined)',
    expression: '{{ {{value}} !== undefined && {{value}} !== null }}',
    placeholders: {
      value: {
        description: 'Value to check',
        examples: ['$json.name', '$json.user.email', '$json.items']
      }
    },
    examples: [
      {
        description: 'Check if email exists',
        expression: '{{ $json.email !== undefined && $json.email !== null }}',
        input: { name: 'Test', email: 'test@example.com' },
        output: true
      },
      {
        description: 'Check if a nested path exists',
        expression: '{{ $json.user?.profile?.picture !== undefined && $json.user?.profile?.picture !== null }}',
        input: { user: { profile: {} } }, // picture is missing
        output: false
      }
    ],
    category: 'conditional'
  }
];

/**
 * All expression templates combined
 */
export const expressionTemplates: ExpressionTemplate[] = [
  ...dataAccessTemplates,
  ...stringTemplates,
  ...dateTemplates,
  ...numberTemplates,
  ...arrayTemplates,
  ...objectTemplates,
  ...conditionalTemplates
]; 