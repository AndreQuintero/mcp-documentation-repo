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
    
    // Medium article URL
    this.mediumArticleUrl = process.env.MEDIUM_ARTICLE_URL || "https://medium.com/@andre.quintero96/the-react-with-custom-cursor-library-773007d60135";

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
        },
        {
          name: "get_medium_article",
          description: "Fetch the Medium article tutorial about the with-custom-cursor library",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "get_all_documentation",
          description: "Get comprehensive documentation including README, Medium article, and key project files",
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
        } else if (name === "get_medium_article") {
          return await this.getMediumArticle(args);
        } else if (name === "get_all_documentation") {
          return await this.getAllDocumentation(args);
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

  async getMediumArticle() {
    try {
      const response = await fetch(this.mediumArticleUrl, {
        headers: {
          'User-Agent': 'MCP-WithCustomCursor-Server',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Medium article: ${response.status}`);
      }

      let html = await response.text();
      
      // Basic HTML to text conversion for Medium articles
      // Remove script and style tags
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      
      // Extract article content (Medium-specific selectors)
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        html = articleMatch[1];
      }
      
      // Convert HTML to markdown-like text
      html = html.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n# $1\n');
      html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
      html = html.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
      html = html.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
      html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
      html = html.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n');
      html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
      html = html.replace(/<[^>]+>/g, ''); // Remove remaining HTML tags
      html = html.replace(/&nbsp;/g, ' ');
      html = html.replace(/&amp;/g, '&');
      html = html.replace(/&lt;/g, '<');
      html = html.replace(/&gt;/g, '>');
      html = html.replace(/&quot;/g, '"');
      
      // Clean up extra whitespace
      html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
      html = html.trim();

      return {
        content: [
          {
            type: "text",
            text: `# Medium Article: with-custom-cursor Tutorial\n\nSource: ${this.mediumArticleUrl}\n\n---\n\n${html}`,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Failed to fetch Medium article: ${error.message}`);
    }
  }

  async getAllDocumentation() {
    try {
      // Fetch README
      let readmeContent = "";
      try {
        const readmeResult = await this.getReadme({});
        readmeContent = readmeResult.content[0].text;
      } catch (error) {
        readmeContent = `README not available: ${error.message}`;
      }

      // Fetch Medium article
      let articleContent = "";
      try {
        const articleResult = await this.getMediumArticle({});
        articleContent = articleResult.content[0].text;
      } catch (error) {
        articleContent = `Medium article not available: ${error.message}`;
      }

      // Fetch package.json for additional context
      let packageInfo = "";
      try {
        const packageResult = await this.getFileContent({ file_path: "package.json" });
        packageInfo = packageResult.content[0].text;
      } catch (error) {
        packageInfo = `Package.json not available: ${error.message}`;
      }

      const combinedContent = `# Complete with-custom-cursor Documentation\n\n` +
        `Repository: https://github.com/${this.owner}/${this.repo}\n` +
        `Last updated: ${new Date().toISOString()}\n\n` +
        `---\n\n${readmeContent}\n\n` +
        `---\n\n${articleContent}\n\n` +
        `---\n\n${packageInfo}`;

      return {
        content: [
          {
            type: "text",
            text: combinedContent,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Failed to compile documentation: ${error.message}`);
    }
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