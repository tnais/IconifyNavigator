#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building standalone executables for Windows and Linux..."
npm run desktop:package:all

echo "Done. Artifacts are in dist-desktop/."
