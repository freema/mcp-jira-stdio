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

**Basic auth:**

```bash
docker run -it --rm \
  -e JIRA_BASE_URL="https://your-instance.atlassian.net" \
  -e JIRA_EMAIL="your-email@example.com" \
  -e JIRA_API_TOKEN="your-api-token" \
  freema/mcp-jira-stdio:latest
```

**OAuth 2.0:**

OAuth requires a browser callback, so it is not suitable for fully headless Docker usage. If you need OAuth inside Docker, expose the callback port and open the printed URL manually on first run:

```bash
docker run -it --rm \
  -p 7789:7789 \
  -e JIRA_BASE_URL="https://your-instance.atlassian.net" \
  -e JIRA_AUTH_TYPE="oauth" \
  -e JIRA_OAUTH_CLIENT_ID="your-client-id" \
  -e JIRA_OAUTH_CLIENT_SECRET="your-client-secret" \
  freema/mcp-jira-stdio:latest
```

To persist tokens across container restarts, mount the token directory:

```bash
docker run -it --rm \
  -p 7789:7789 \
  -v "$HOME/.mcp-jira-stdio:/root/.mcp-jira-stdio" \
  -e JIRA_BASE_URL="https://your-instance.atlassian.net" \
  -e JIRA_AUTH_TYPE="oauth" \
  -e JIRA_OAUTH_CLIENT_ID="your-client-id" \
  -e JIRA_OAUTH_CLIENT_SECRET="your-client-secret" \
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

**Basic auth:**

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
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

**OAuth 2.0** (with token persistence and callback port):

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-p", "7789:7789",
        "-v", "/Users/you/.mcp-jira-stdio:/root/.mcp-jira-stdio",
        "-e", "JIRA_BASE_URL",
        "-e", "JIRA_AUTH_TYPE",
        "-e", "JIRA_OAUTH_CLIENT_ID",
        "-e", "JIRA_OAUTH_CLIENT_SECRET",
        "freema/mcp-jira-stdio:latest"
      ],
      "env": {
        "JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "JIRA_AUTH_TYPE": "oauth",
        "JIRA_OAUTH_CLIENT_ID": "your-client-id",
        "JIRA_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```
