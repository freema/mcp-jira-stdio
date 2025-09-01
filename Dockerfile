# Build stage
FROM node:20.18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM node:20.18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# MCP servers typically use stdio, not HTTP ports
# So EXPOSE is not needed for stdio-based MCP servers
# EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV MCP_MODE=stdio

# Health check is not applicable for stdio MCP servers
# as they communicate via stdin/stdout, not HTTP

# Start the MCP server
CMD ["node", "dist/index.js"]