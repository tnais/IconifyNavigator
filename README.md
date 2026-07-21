# IconifyNavigator

A modern, feature-rich web application for browsing and managing icons from [Iconify](https://iconify.design) installations. Built with Angular and React, supporting both web and desktop deployments via Docker.

## Features

- **Icon Collection Browser** — Browse all available icon sets with search and filtering
- **Icon Search** — Search icons by name, category, tags, and icon set name
- **Icon Details** — View comprehensive icon information including size, color, rotation, and flip options
- **Icon Preview** — Real-time preview of icons with customizable parameters
- **Dark/Light Theme** — Automatic theme switching with contrasting icon colors
- **Lazy Loading** — Infinite scroll for efficient icon browsing
- **Docker Support** — Deploy with Docker using Paketo buildpacks or traditional Dockerfile
- **Desktop Application** — Cross-platform desktop app with Electron
- **Configuration File** — Support for custom Iconify server URLs

## Version

Current Version: **1.0.4**

See [CHANGELOG](./AcceptanceCriteria.md) for release notes and features.

## Quick Start

### Web Application

```bash
# Install dependencies
npm install

# Serve the Angular application
npm run server

# Build for production
npm run build

# Start the production server
npm start
```

The application will be available at `http://localhost:3000`.

### Docker

```bash
# Build Docker image
docker build -t iconify-navigator:latest .

# Run the container
docker run -p 3000:3000 iconify-navigator:latest
```

See [DOCKER.md](./DOCKER.md) for detailed Docker and Paketo build instructions.

### Desktop Application

```bash
# Package for Windows
npm run desktop:package:win

# Package for Linux
npm run desktop:package:linux

# Package for all platforms
npm run desktop:package:all
```

## Architecture

- **Frontend**: Angular 21 with TypeScript
- **Build Tool**: Angular CLI
- **Styling**: CSS with theme support
- **Testing**: Jest for unit tests, Robot Framework for acceptance tests
- **Deployment**: Docker, Electron desktop app

## Testing

```bash
# Run unit tests
npm test

# Run acceptance tests (Robot Framework)
npm run test:robot

# Run acceptance tests for React version
npm run test:robot:react
```

## Configuration

The application reads the Iconify server URL from a configuration file accessible via HTTP at the same base path. The default server is `https://api.iconify.design`.

To customize the server URL:
1. Create a configuration file accessible at your deployment base URL
2. The file should contain the Iconify server URL as plain text

## License

GPL-3.0-or-later

## Contributing

Contributions are welcome! Please ensure all tests pass and documentation is updated accordingly.

## Repository

- [GitHub Repository](https://github.com/tnais/IconifyNavigator)
- [Issue Tracker](https://github.com/tnais/IconifyNavigator/issues)
