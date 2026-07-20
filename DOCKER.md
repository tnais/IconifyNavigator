# Docker & Paketo Setup for IconifyNavigator

This project includes configuration files for building and running IconifyNavigator in Docker containers using either Paketo buildpacks or a traditional Dockerfile.

## Files Added

- **`project.toml`** — Paketo buildpack configuration (Spring Boot-style CNB config)
- **`Dockerfile`** — Multi-stage Dockerfile for building and running the app
- **`.dockerignore`** — Files excluded from Docker build context
- **`npm start` script** — Added to `package.json` for containerized execution

## Building with Paketo Buildpacks

Paketo Buildpacks provide a fully automated, secure, and production-ready build process without needing to maintain a Dockerfile. This approach:
- Automatically detects Node.js and runs build scripts
- Applies best practices for image layering and caching
- Includes vulnerability scanning and patch management
- Generates SBOMs (Software Bill of Materials)

### Prerequisites

Install the `pack` CLI:
```bash
# macOS (with Homebrew)
brew install buildpacks/tap/pack

# Linux
# Visit: https://buildpacks.io/docs/tools/pack/

# Windows
# Download from: https://github.com/buildpacks/pack/releases
```

### Build with Paketo

```bash
# Build using the default Paketo builder
pack build iconify-navigator:latest

# Build with a specific builder (recommended for reproducibility)
pack build iconify-navigator:latest \
  --builder paketobuildpacks/builder-jammy:latest

# View details about the image
pack inspect iconify-navigator:latest
```

### Run the Paketo Image

```bash
docker run -p 3000:3000 iconify-navigator:latest
```

The app will be available at `http://localhost:3000`.

## Building with Dockerfile

Use the traditional `docker build` command if you prefer explicit control over the build process:

```bash
# Build the image
docker build -t iconify-navigator:latest .

# Build with custom build args (if needed in the future)
docker build -t iconify-navigator:latest \
  --build-arg NODE_ENV=production \
  .
```

### Run the Docker Image

```bash
docker run -p 3000:3000 iconify-navigator:latest
```

## Docker Compose (Optional)

For local development with multiple services, create a `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000')"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Environment Variables

The app respects the following environment variables at runtime:

- **`PORT`** (default: 3000) — Port to listen on
- **`NODE_ENV`** (default: production) — Node environment

Example:
```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  iconify-navigator:latest
```

## Configuration Files

### `project.toml`

Configures Paketo behavior:
- `BP_NODE_RUN_SCRIPTS = "build"` — Runs `npm run build` as the build script
- `BP_WEB_SERVER_ROOT = "dist/iconifynavigator"` — Serves static files from build output
- `BP_WEB_SERVER_ENABLE_PUSH_STATE = "true"` — Enables SPA routing (redirects to index.html)

### `Dockerfile`

Multi-stage build that:
1. **Builder stage** — Installs deps and builds Angular app
2. **Runtime stage** — Copies only artifacts and serves them with `serve`

Benefits:
- Significantly smaller final image (no build tools included)
- Fast layer caching for iterative development
- Security: no source code or build dependencies in final image

### `.dockerignore`

Excludes unnecessary files from the Docker build context:
- `node_modules/`, build artifacts
- `.git/`, test files, logs
- Development/IDE files (`.idea/`, `*.log`)

Reduces build context size and speeds up builds.

## Pushing to a Registry

### Docker Hub

```bash
docker tag iconify-navigator:latest <docker-username>/iconify-navigator:latest
docker push <docker-username>/iconify-navigator:latest
```

### GitHub Container Registry (GHCR)

```bash
docker tag iconify-navigator:latest ghcr.io/<github-username>/iconify-navigator:latest
docker push ghcr.io/<github-username>/iconify-navigator:latest
```

### Azure Container Registry

```bash
az acr build --registry <registry-name> --image iconify-navigator:latest .
```

## Verifying the Container

```bash
# Check image details
docker inspect iconify-navigator:latest

# Run with verbose logging
docker run -e DEBUG=* -p 3000:3000 iconify-navigator:latest

# Check if the app is healthy
docker ps --filter "name=iconify" --format "table {{.ID}}\t{{.Status}}"
```

## Production Considerations

1. **Security**: Use distroless or minimal base images to reduce attack surface
2. **Layering**: Ensure deps are cached; only source code changes invalidate that layer
3. **Health checks**: The Dockerfile includes a health check endpoint
4. **Logs**: Direct logs to stdout/stderr for container orchestration visibility
5. **Non-root user** (advanced): Consider running as a non-root user in production

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=registry
          cache-to: type=inline
```

## Troubleshooting

**Container won't start:**
- Check logs: `docker logs <container-id>`
- Verify ports: `docker port <container-id>`

**Slow builds:**
- Ensure `.dockerignore` is comprehensive
- Build context should be <100MB
- Consider using `pack` for better caching

**Image is too large:**
- Multi-stage builds should keep image ~150-200MB
- Remove dev dependencies in production (already done in Dockerfile)

## Further Reading

- [Paketo Buildpacks Documentation](https://paketo.io/)
- [Docker Official Images](https://hub.docker.com/_/node)
- [Best Practices for Node.js in Docker](https://snyk.io/blog/10-docker-image-security-best-practices/)
