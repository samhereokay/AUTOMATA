FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json for the workspace root
COPY package.json package-lock.json ./

# Copy package jsons for workspaces
COPY packages/news-intelligence/package.json ./packages/news-intelligence/
COPY packages/ai-provider/package.json ./packages/ai-provider/
COPY packages/n8n-client/package.json ./packages/n8n-client/
COPY packages/planner/package.json ./packages/planner/
COPY packages/workflow-registry/package.json ./packages/workflow-registry/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start", "--workspace=@automata/web"]
