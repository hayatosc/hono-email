#!/bin/sh
set -e
cd "$(dirname "$0")"
node ../dist/cli.mjs --dir . --port 3333