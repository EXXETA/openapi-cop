#!/usr/bin/env bash

cd /data

echo "Cleaning, then installing..." 
(cd mock && npm install --depth 0 && npm run clean)
npm install --depth 0 && npm run clean
echo "Running tests..."
DEBUG=openapi-cop:* npm test
