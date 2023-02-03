#!/bin/bash

docker build . -f docker/Dockerfile -t lxlu/openapi-cop:test --label test
