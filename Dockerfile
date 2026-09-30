FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json for the workspace root
COPY package.json package-lock.json ./

COPY packages/news-intelligence/package.json ./packages/news-intelligence/

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY apps/website/ ./apps/website/
COPY packages/news-intelligence/ ./packages/news-intelligence/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application using tsx as per existing dev patterns
CMD ["npx", "tsx", "packages/news-intelligence/src/server.ts"]
