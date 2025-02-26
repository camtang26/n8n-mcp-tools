# Integrating with Cursor

This guide explains how to integrate the n8n-mcp-tools server with Cursor IDE to enhance n8n workflow development.

## Prerequisites

- Cursor IDE installed on your machine
- n8n instance running locally or in the cloud
- n8n-mcp-tools server running

## Step 1: Start the MCP Server

First, ensure the n8n-mcp-tools server is running:

```bash
# Go to the n8n-mcp-tools directory
cd path/to/n8n-mcp-tools

# Install dependencies if you haven't already
npm install

# Build the TypeScript code
npm run build

# Start the MCP server
npm start
```

By default, the server will start on port 3000. If you want to use a different port, set the `MCP_SERVER_PORT` environment variable in your `.env` file.

## Step 2: Configure Cursor

To add the MCP server to Cursor:

1. Open Cursor IDE
2. Open Settings (Ctrl+, or ⌘+, on Mac)
3. Navigate to the "Features" section
4. Find the "Model Context Protocol (MCP)" section
5. Click "Add Server"
6. Enter the following details:
   - **Name**: n8n Tools
   - **URL**: http://localhost:3000 (or the URL where your MCP server is running)
7. Click "Save"

## Step 3: Use the n8n Tools in Cursor

Once the MCP server is configured, you can use the tools in Cursor:

1. Open a file in Cursor
2. Type "@" to bring up the tool menu
3. Select "n8n Tools" (or the name you gave the server)
4. Choose one of the available tools, such as:
   - `n8n/list_workflows`
   - `n8n/create_research_workflow`
   - `n8n/run_workflow`
5. Provide the required parameters when prompted

## Example Usage

Here are some examples of how to use the n8n tools in Cursor:

### Listing Workflows

```
@n8n/list_workflows
```

This will return a list of all workflows in your n8n instance.

### Creating a Research Workflow

```
@n8n/create_research_workflow
{
  "name": "Competitor Analysis",
  "description": "Research competitors in our industry",
  "research_sources": ["google", "twitter", "reddit"]
}
```

This will create a new research workflow in n8n with nodes configured for Google, Twitter, and Reddit searches.

### Running a Workflow

```
@n8n/run_workflow
{
  "id": "your-workflow-id",
  "input_data": {
    "searchTerm": "AI trends 2024"
  }
}
```

This will execute the specified workflow with the provided input data.

## Troubleshooting

If you encounter issues:

1. **MCP Server Connection Issues**:
   - Ensure the MCP server is running
   - Check the URL in Cursor settings
   - Verify there are no network restrictions blocking the connection

2. **n8n API Errors**:
   - Check that your n8n instance is running
   - Verify the N8N_API_URL and N8N_API_KEY in the `.env` file

3. **Tool Execution Errors**:
   - Check the server logs for detailed error messages
   - Ensure you're providing all required parameters for the tool

## Advanced Configuration

For advanced configuration options, see the [Configuration Guide](./configuration.md). 