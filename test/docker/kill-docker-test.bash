#!/bin/bash

docker kill $(docker ps -q --filter ancestor=lxlu/openapi-cop:test)
