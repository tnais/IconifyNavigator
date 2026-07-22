# Copilot Instructions for IconifyNavigator

## Build, Test, and Lint Commands

### Development & Building
- **Serve Angular**: `npm run server` (runs at http://localhost:3000)
- **Serve React**: `npm run serve:react` (development build)
- **Production build**: `npm run build` (outputs to `dist/iconifynavigator/`)
- **Start production server**: `npm start` (serves dist on port 3000)

### Testing
- **Unit tests (all)**: `npm test`
- **Unit tests (watch mode)**: `npm test -- --watch`
- **Unit tests (single file)**: `npm test -- src/app/components/icon-search/icon-search.component.spec.ts`
- **Unit tests (coverage)**: `npm test -- --coverage`
- **Acceptance tests (Angular)**: `npm run test:robot` (requires Robot Framework installed)
- **Acceptance tests (React)**: `npm run test:robot:react`

### Desktop Applications
- **Build and launch**: `npm run desktop:start`
- **Package for Windows**: `npm run desktop:package:win`
- **Package for Linux**: `npm run desktop:package:linux`
- **Package for all platforms**: `npm run desktop:package:all` (outputs to `dist-desktop/`)

### Docker
- **Build**: `docker build -t iconify-navigator:latest .`
- **Run**: `docker run -p 3000:3000 iconify-navigator:latest`
- See `DOCKER.md` for Paketo buildpack instructions (uses `project.toml`)

## Project Architecture

### Core Structure
```
src/
├── app/
│   ├── components/          # Standalone Angular components
│   │   ├── app/             # Root application component
│   │   ├── icon-search/     # Search interface
│   │   ├── icon-browser/    # Main icon browsing view
│   │   └── collection-card/ # Individual icon set card
│   ├── services/            # Angular services (DI)
│   │   └── iconify.service.ts # API calls to Iconify server
│   ├── models/              # TypeScript interfaces
│   └── *.acceptance.spec.ts # High-level feature tests
├── assets/                  # Static files (icons, images)
├── styles.css              # Global styles
├── main.ts                 # Angular entry point
└── iconify-server.txt      # Configuration file (Iconify API URL)
```

### Multi-Target Deployment
- **Web**: Angular 21 (primary target)
- **React**: Parallel React app in `react-app/` directory (separate build)
- **Desktop**: Electron wrapper in `desktop/` directory
- **Docker**: Multi-stage build supports Node.js and Paketo buildpacks

### Angular + TypeScript Setup
- **Framework**: Angular 21 with strict mode enabled
- **Module System**: ES2022 with CommonJS main entry for Electron
- **Decorators**: Experimental decorators enabled
- **Target**: ES2022
- **Zone.js**: Required for Angular change detection and Electron compatibility

## Key Conventions

### Path Aliases (in tsconfig.json)
Always use these aliases in imports for clean, maintainable paths:
```typescript
import { IconifyService } from '@services/iconify.service';
import { IconComponent } from '@components/icon-browser/icon-browser.component';
import { Icon } from '@models/icon.model';
import { AppComponent } from '@app/app.component'; // app root
```

### Testing Patterns
- **Unit tests**: Colocated with source files as `*.spec.ts`
- **Jest config**: Maps the same path aliases as tsconfig
- **IntersectionObserver mock**: Pre-configured in `setup-jest.ts` so lazy-loading triggers immediately in tests
- **Acceptance tests**: Robot Framework `.robot` files in `robot/tests/` (versioned by release)
- **Test isolation**: Each `.robot` file is a complete test suite; use `--variable APP_URL:http://localhost:PORT` to target different builds

### Component Architecture
- **Standalone components**: Angular 14+ standalone pattern (no module declarations needed)
- **RxJS**: Use reactive patterns with `Observable` and `Subject` (v7.8.2)
- **Change detection**: Default strategy is fine; OnPush is optional
- **Styling**: Global CSS in `styles.css` with BEM-style class naming where needed

### Configuration & Deployment
- **Iconify Server URL**: Read from `iconify-server.txt` (plain text) at app root
- **Default server**: `https://api.iconify.design`
- **Custom server**: Replace `iconify-server.txt` before deployment or at runtime via HTTP
- **Desktop config**: Electron uses the same build as web (see `electron.js` integration)

### Desktop/Electron Integration
- **Entry point**: `desktop/main.js` (Node.js main in package.json)
- **Build artifact**: Web app built to `dist/iconifynavigator/` is bundled by electron-builder
- **Config**: `build` field in `package.json` defines output (`dist-desktop/`) and file inclusion patterns
- **App ID**: `com.iconifynavigator.desktop` (used for updates, signing)

## Development Workflow Tips

### When Working with Components
1. Update tests first (place in same directory as component)
2. Use path aliases consistently
3. Leverage IntersectionObserver for lazy-loaded collections (it's pre-mocked in jest setup)
4. Import types from `@models/` to maintain clean boundaries

### When Adding Tests
- Unit tests run via Jest with jsdom environment (browser-like context)
- Mock strategies are pre-configured (IntersectionObserver, etc.)
- Single-file test runs: `npm test -- path/to/file.spec.ts`
- Acceptance tests require the app to be running (Robot Framework connects via Playwright)

### When Building for Deployment
- `npm run build` creates optimized Angular production build with budget warnings (500kb initial)
- `npm start` runs a minimal Node.js server (fallback: `npx serve -s dist`)
- Docker images use `npm run build && npm start` internally

### When Working on Desktop App
- Desktop and web share the same Angular build
- Only rebuild `npm run build` once; electron-builder packages it for each platform
- Output in `dist-desktop/` includes portable executables (Windows) and zips (Linux)

## Dependency Notes
- **Angular 21.2.18**: Latest major version with improved standalone components
- **TypeScript 5.9.3**: Strict mode strongly recommended
- **Jest 30.4.2** with **jest-preset-angular 17.0.0**: Pre-configured for Angular testing
- **Electron 31.7.7** with **electron-builder 24.13.3**: Desktop packaging
- **RxJS 7.8.2**: Reactive library for services and components
