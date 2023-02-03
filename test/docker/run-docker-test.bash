#!/bin/bash

cliArguments=$1
schemasDir=$(readlink -f "$(dirname $0)/../schemas")

containerId=$(docker run -d --network="host" \
  -v "$schemasDir:/schemas" \
  --env "CLI_ARGUMENTS=$cliArguments" \
  --env "DEBUG=openapi-cop:*" \
  --env "CI=true" \
  lxlu/openapi-cop:test)

echo "Proxy container: ${containerId:0:8}"
