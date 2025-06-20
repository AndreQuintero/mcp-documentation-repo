# with-custom-cursor Documentation Server

This project provides a documentation server for the [with-custom-cursor](https://github.com/AndreQuintero/with-custom-cursor) library. It exposes endpoints to fetch the README, project files, file contents, documentation search, and a Medium article tutorial for the library.

## Features
- Fetch the latest README from the GitHub repository
- List all files in the repository
- Retrieve the content of any file in the repository
- Search for documentation and markdown files
- Fetch and convert a Medium article tutorial to markdown
- Aggregate all documentation into a single response

## Usage
This server is intended to be run as a Node.js process. It communicates using the Model Context Protocol (MCP) and is designed for integration with tools that support MCP servers.

### Requirements
- Node.js (v14 or higher recommended)
- Internet access to fetch data from GitHub and Medium

### Environment Variables
- `GITHUB_TOKEN` (optional): GitHub API token for increased rate limits
- `MEDIUM_ARTICLE_URL` (optional): Override the default Medium article URL

### Running the Server
```
npm install
node index.js
```

The server will start and listen for MCP requests via stdio.

## Endpoints / Tools
- **get_readme**: Fetch the README file from the repository
- **get_project_files**: List all files in the repository
- **get_file_content**: Get the content of a specific file
- **search_docs**: Search for markdown documentation files
- **get_medium_article**: Fetch and convert the Medium tutorial article
- **get_all_documentation**: Aggregate README, Medium article, and key files

## Project Structure
- `index.js`: Main server implementation

## References
- [with-custom-cursor GitHub Repository](https://github.com/AndreQuintero/with-custom-cursor)
- [Medium Article: The React with-custom-cursor Library](https://medium.com/@andre.quintero96/the-react-with-custom-cursor-library-773007d60135)

## License
MIT