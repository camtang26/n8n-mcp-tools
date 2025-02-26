const fs = require('fs');
const path = require('path');

// List of files with SDK imports to update
const files = [
  'src/tools/workflow-management/listWorkflows.ts',
  'src/tools/workflow-management/getWorkflow.ts',
  'src/tools/workflow-management/deleteWorkflow.ts',
  'src/tools/workflow-management/createWorkflow.ts',
  'src/tools/workflow-management/activateWorkflow.ts',
  'src/tools/workflow-development/generateNode.ts',
  'src/tools/workflow-development/createSocialPostWorkflow.ts',
  'src/tools/workflow-development/createResearchWorkflow.ts',
  'src/tools/templates/listTemplates.ts',
  'src/tools/templates/applyTemplate.ts',
  'src/tools/debugging/getExecutionLogs.ts',
  'src/tools/debugging/fixWorkflowError.ts'
];

// Process each file
files.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  
  // Read the file
  fs.readFile(fullPath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return;
    }
    
    // Replace the SDK import with our mock
    const updatedContent = data.replace(
      /import\s+{([^}]*)}\s+from\s+['"]@modelcontextprotocol\/sdk['"]/g,
      'import {$1} from \'../../utils/mockSdk\''
    );
    
    // Write the updated content back to the file
    fs.writeFile(fullPath, updatedContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error(`Error writing file ${filePath}:`, writeErr);
        return;
      }
      
      console.log(`Updated imports in ${filePath}`);
    });
  });
}); 