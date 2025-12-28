#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Starting Security Dashboard..."

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "▶️  Running Dev Server..."
npm run dev
