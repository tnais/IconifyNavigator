# Multi-stage build for IconifyNavigator

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY angular.json tsconfig*.json jest.config.js setup-jest.ts ./
COPY src ./src
COPY desktop ./desktop
COPY react-app ./react-app
COPY public ./public

# Build the Angular app
RUN npm run build -- --configuration production

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install a lightweight web server
RUN npm install -g serve

# Copy only built artifacts
COPY --from=builder /app/dist/iconifynavigator ./dist
COPY --from=builder /app/src/iconify-server.txt ./dist/ 2>/dev/null || true

# Expose default port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run the web server
CMD ["serve", "-s", "dist", "-l", "3000"]
