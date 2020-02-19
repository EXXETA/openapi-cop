#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
MSYS_NO_PATHCONV=1 docker run --rm -it -v "$DIR/..":/data -v "$DIR/entrypoint.bash":/entrypoint.bash node:10.15.3 bash 'entrypoint.bash'
