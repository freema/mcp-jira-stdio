# Docker Support

## Quick Start

Pull and run the latest image:

```bash
docker pull freema/mcp-jira-stdio:latest
# or from GitHub Container Registry
docker pull ghcr.io/freema/mcp-jira-stdio:latest
```

## Running with Docker

### Using docker run

```bash
docker run -it --rm \
  -e JIRA_BASE_URL="https://your-instance.atlassian.net" \
  -e JIRA_EMAIL="your-email@example.com" \
  -e JIRA_API_TOKEN="your-api-token" \
  freema/mcp-jira-stdio:latest
```

### Using docker-compose

```bash
docker-compose up
```

## Building Locally

```bash
docker build -t mcp-jira-stdio .
docker run -it --rm mcp-jira-stdio
```

## Multi-architecture Support

Images are published for both amd64 and arm64 architectures.

## Integration with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "JIRA_BASE_URL",
        "-e", "JIRA_EMAIL",
        "-e", "JIRA_API_TOKEN",
        "freema/mcp-jira-stdio:latest"
      ],
      "env": {
        "JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

