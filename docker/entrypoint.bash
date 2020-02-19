#!/usr/bin/env bash

cd /data

echo "Cleaning, then installing..." 
npm run clean-install
echo "Running tests..."
cd proxy && DEBUG=openapi-cop:* npm test
