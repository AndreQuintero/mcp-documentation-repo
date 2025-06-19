#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

class GitHubDocServer {
  constructor() {
    this.server = new Server(
      {
        name: "with-custom-cursor-doc-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Specific repository configuration
    this.owner = "AndreQuintero";
    this.repo = "with-custom-cursor";
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_readme",
          description: "Fetch README documentation from the with-custom-cursor repository",
          inputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
                description: "Branch name (optional, defaults to main)",
                default: "main"
              }
            },
            required: [],
          },
        },
        {
          name: "get_project_files",
          description: "Get a list of all files in the with-custom-cursor repository",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Directory path to explore (optional, defaults to root)",
                default: ""
              }
            },
            required: [],
          },
        },
        {
          name: "get_file_content",
          description: "Get content of a specific file from the with-custom-cursor repository",
          inputSchema: {
            type: "object",
            properties: {
              file_path: {
                type: "string",
                description: "Path to the file (e.g., 'src/index.js', 'package.json')",
              },
              branch: {
                type: "string",
                description: "Branch name (optional, defaults to main)",
                default: "main"
              }
            },
            required: ["file_path"],
          },
        },
        {
          name: "search_docs",
          description: "Search for documentation and markdown files in the repository",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "get_readme") {
          return await this.getReadme(args);
        } else if (name === "get_project_files") {
          return await this.getProjectFiles(args);
        } else if (name === "get_file_content") {
          return await this.getFileContent(args);
        } else if (name === "search_docs") {
          return await this.searchDocs(args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getReadme({ branch = "main" }) {
    const readmeFiles = ["README.md", "readme.md", "Readme.md", "README.MD"];
    const branches = [branch, "main", "master"];

    for (const branchName of branches) {
      for (const filename of readmeFiles) {
        try {
          const url = `${this.baseUrl}/contents/${filename}?ref=${branchName}`;
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'MCP-WithCustomCursor-Server',
              ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
            }
          });

          if (response.ok) {
            const data = await response.json();
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return {
              content: [
                {
                  type: "text",
                  text: `# with-custom-cursor Project Documentation\n\nRepository: https://github.com/${this.owner}/${this.repo}\nFile: ${filename} (branch: ${branchName})\n\n---\n\n${content}`,
                },
              ],
            };
          }
        } catch (error) {
          continue; // Try next combination
        }
      }
    }

    throw new Error(`README not found in ${this.owner}/${this.repo}. Tried multiple branches and filename variations.`);
  }

  async getProjectFiles({ path = "" }) {
    const url = `${this.baseUrl}/contents/${path}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MCP-WithCustomCursor-Server',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files from ${this.owner}/${this.repo}${path ? `/${path}` : ''}`);
    }

    const data = await response.json();
    const fileList = Array.isArray(data) ? data : [data];
    
    const files = fileList.map(item => ({
      name: item.name,
      type: item.type,
      path: item.path,
      size: item.size,
      url: item.html_url
    }));

    return {
      content: [
        {
          type: "text",
          text: `# Files in with-custom-cursor${path ? `/${path}` : ''}\n\n${files.map(f => 
            `- **${f.name}** (${f.type}) - ${f.size} bytes\n  Path: \`${f.path}\`\n  URL: ${f.url}`
          ).join('\n\n')}`,
        },
      ],
    };
  }

  async getFileContent({ file_path, branch = "main" }) {
    const url = `${this.baseUrl}/contents/${file_path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MCP-WithCustomCursor-Server',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!response.ok) {
      throw new Error(`File not found: ${file_path} in branch ${branch}`);
    }

    const data = await response.json();
    
    if (data.type !== 'file') {
      throw new Error(`${file_path} is not a file (it's a ${data.type})`);
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const fileExtension = file_path.split('.').pop()?.toLowerCase();
    
    return {
      content: [
        {
          type: "text",
          text: `# File: ${file_path}\n\nRepository: with-custom-cursor\nBranch: ${branch}\nSize: ${data.size} bytes\n\n\`\`\`${fileExtension || ''}\n${content}\n\`\`\``,
        },
      ],
    };
  }

  async searchDocs() {
    const url = `https://api.github.com/search/code?q=filename:*.md+repo:${this.owner}/${this.repo}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MCP-WithCustomCursor-Server',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search documentation in ${this.owner}/${this.repo}`);
    }

    const data = await response.json();
    const files = data.items.map(item => ({
      name: item.name,
      path: item.path,
      url: item.html_url
    }));

    return {
      content: [
        {
          type: "text",
          text: `# Documentation files found in with-custom-cursor:\n\n${files.length > 0 ? 
            files.map(f => `- **${f.name}**\n  Path: \`${f.path}\`\n  URL: ${f.url}`).join('\n\n') : 
            'No markdown documentation files found.'
          }`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("with-custom-cursor Documentation MCP server running on stdio");
  }
}

const server = new GitHubDocServer();
server.run().catch(console.error);