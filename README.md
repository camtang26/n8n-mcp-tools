# n8n-mcp-tools

A collection of tools that implement the Model Context Protocol (MCP) to enable AI assistants to interact with n8n instances.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol developed by Anthropic that standardizes how applications provide context to Large Language Models (LLMs). It's described as a "USB-C port for AI applications" - providing a standardized way to connect AI models to different data sources and tools.

MCP follows a client-server architecture:
- **MCP Hosts**: Programs like Claude Desktop, Cursor IDE, or AI tools that want to access data through MCP
- **MCP Clients**: Protocol clients that maintain 1:1 connections with servers
- **MCP Servers**: Lightweight programs (like this one) that expose specific capabilities through the standardized Model Context Protocol

## What is n8n?

n8n is an extensible workflow automation tool that allows you to connect various services and applications. It provides a visual interface for creating workflows without requiring programming knowledge.

## Project Goals

This project aims to:

1. Create MCP servers that allow AI assistants like Claude to interact with n8n instances
2. Enable AI-assisted workflow creation, modification, and debugging in n8n
3. Allow natural language queries about n8n workflows and their execution status
4. Provide a reference implementation for building MCP tools that work with workflow automation platforms

## Tools Provided

This MCP server exposes the following tools to Cursor and other MCP clients:

### Workflow Management Tools
- `n8n/list_workflows` - List all existing workflows with their activation status
- `n8n/get_workflow` - View details of a specific workflow
- `n8n/create_workflow` - Generate a new workflow from a description
- `n8n/activate_workflow` - Activate or deactivate a workflow
- `n8n/delete_workflow` - Remove a workflow

### Workflow Development Tools
- `n8n/create_research_workflow` - Generate a specialized research workflow with proper node configuration
- `n8n/create_social_post_workflow` - Generate a workflow for posting to social media
- `n8n/generate_node` - Create JSON for a specific node type with proper configuration

### Debugging Tools
- `n8n/run_workflow` - Execute a workflow and return results
- `n8n/get_execution_logs` - Retrieve execution logs for debugging
- `n8n/fix_workflow_error` - Analyze and suggest fixes for common workflow errors

### Template Tools
- `n8n/list_templates` - List available workflow templates
- `n8n/apply_template` - Apply a template to create a new workflow

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- n8n instance (local or cloud)
- MCP Host like Claude Desktop, Cursor AI, or custom implementation

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/n8n-mcp-tools.git
cd n8n-mcp-tools

# Install dependencies
npm install

# Create a .env file from the example
cp .env.example .env

# Edit the .env file to add your n8n API URL and key
# N8N_API_URL=http://localhost:5678/api/v1
# N8N_API_KEY=your_n8n_api_key
```

### Running the MCP Server

```bash
# Build the TypeScript code
npm run build

# Start the MCP server
npm start
```

By default, the server runs using the stdio transport for local integration with tools like Cursor. You can configure this in your `.env` file.

## Integrating with Cursor IDE

To integrate this MCP server with Cursor:

1. Ensure the MCP server is running
2. Open Cursor IDE
3. Open Settings (Ctrl+, or ⌘+, on Mac)
4. Navigate to Features → Model Context Protocol (MCP)
5. Click "Add Server"
6. Enter the following details:
   - **Name**: n8n Tools
   - **URL**: http://localhost:3000 (or your configured port)
7. Click "Save"

Now you can use the n8n tools in Cursor by typing "@" and selecting the n8n tools from the menu.

See the [Cursor Integration Guide](docs/cursor-integration.md) for more details and examples.

## Architecture

This project follows the MCP client-server architecture:

1. **MCP Host**: A program like Claude Desktop or Cursor AI that wants to interact with n8n
2. **MCP Client**: Integrated within the host application, manages connections to MCP servers
3. **MCP Server**: This project, which exposes n8n capabilities through the MCP protocol

## Project Structure

- `src/` - Source code for the MCP servers
  - `api/` - n8n API client implementation
  - `tools/` - MCP tool implementations
    - `workflow-management/` - Workflow management tools
    - `workflow-development/` - Workflow development tools
    - `debugging/` - Debugging tools
    - `templates/` - Template tools
  - `templates/` - Workflow templates and generators
- `docs/` - Documentation
- `dist/` - Compiled JavaScript code (generated)

## License

MIT License - See the [LICENSE](LICENSE) file for details. 