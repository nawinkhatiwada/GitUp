#!/usr/bin/env bash
# Build the Chrome Web Store upload zip: dist/gitup-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/gitup-${version}.zip"
mkdir -p dist
rm -f "$out"
zip -r -X -q "$out" manifest.json src icons -x '*.DS_Store'
echo "Built $out"
unzip -l "$out"
