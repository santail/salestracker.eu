FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/scraper-service ./apps/scraper-service
COPY libs ./libs

# Build the application
RUN npm run build scraper-service

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist/apps/scraper-service ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "main.js"] 