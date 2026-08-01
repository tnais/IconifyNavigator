import * as fs from 'fs';
import * as path from 'path';

/**
 * Acceptance criteria tests for v1.0.0 and later releases
 * Covers web application build configuration
 */
describe('Acceptance criteria 1.0.0+', () => {
  it('configures npm build and start scripts for web application (v1.0.0+)', () => {
    const root = process.cwd();
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.version).toBe('1.0.4');
    expect(packageJson.scripts['build']).toContain('ng build');
    expect(packageJson.scripts['start']).toBeDefined();
    expect(packageJson.scripts['server']).toContain('ng serve');
  });

  it('does not configure desktop/Electron support (v1.0.0+)', () => {
    const root = process.cwd();
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Desktop support has been removed
    expect(packageJson.main).toBeUndefined();
    expect(packageJson.scripts['desktop:start']).toBeUndefined();
    expect(packageJson.scripts['desktop:package:win']).toBeUndefined();
    expect(packageJson.scripts['desktop:package:linux']).toBeUndefined();
    expect(packageJson.build).toBeUndefined();
    
    // Desktop folder should not exist
    expect(fs.existsSync(path.join(root, 'desktop', 'main.js'))).toBe(false);
  });
});
