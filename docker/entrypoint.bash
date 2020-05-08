#!/bin/bash

cli_args=" "

if [ -n "$TARGET" ]; then
    cli_args="${cli_args}--target ${TARGET} "
fi

if [ -n "$FILE" ]; then
    cli_args="${cli_args}--file ${FILE} "
fi

if [ -n "$DEFAULT_FORBID_ADDITIONAL_PROPERTIES" ]; then
    cli_args="${cli_args}--default-forbid-additional-properties "
fi

if [ -n "$SILENT" ]; then
    cli_args="${cli_args}--silent ${SILENT} "
fi

node build/src/cli $cli_args