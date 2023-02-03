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
    cli_args="${cli_args}--silent "
fi

if [ -n "$VERBOSE" ]; then
    cli_args="${cli_args}--verbose "
fi

if [ -n "$CLI_ARGUMENTS" ]; then
  cli_args="$CLI_ARGUMENTS"
fi

node src/cli --host 0.0.0.0 $cli_args
