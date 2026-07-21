import * as fs from 'fs';
import * as path from 'path';

/**
 * Acceptance criteria tests for v1.0.0 and later releases
 * Covers desktop packaging and containerization support
 */
describe('Acceptance criteria 1.0.0+', () => {
  it('defines desktop packaging targets for Windows and Linux (v1.0.0+)', () => {
    const root = process.cwd();
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.version).toBe('1.0.4');
    expect(packageJson.main).toBe('desktop/main.js');

    expect(packageJson.scripts['desktop:package:win']).toContain('--win');
    expect(packageJson.scripts['desktop:package:linux']).toContain('--linux');

    expect(packageJson.build?.files).toContain('desktop/**/*');
    expect(packageJson.build?.files).toContain('dist/iconifynavigator/**/*');
    expect(packageJson.build?.win?.target).toContain('portable');
    expect(packageJson.build?.linux?.target).toContain('zip');
  });

  it('provides Electron desktop entry files (v1.0.0+)', () => {
    const root = process.cwd();
    expect(fs.existsSync(path.join(root, 'desktop', 'main.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'desktop', 'preload.js'))).toBe(true);
  });
});
