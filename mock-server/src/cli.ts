#!/usr/bin/env node
const debugMod = require('debug');
const debug = debugMod('openapi-cop:mock');
debug.log = console.log.bind(console); // output to stdout
import chalk = require('chalk');
import * as chokidar from 'chokidar';
import * as program from 'commander';
import * as http from 'http';
import * as path from 'path';

import { runApp } from './app';

// Rename for consistent display of package name in help output
process.argv[1] = path.join(process.argv[1], 'openapi-cop-mock-server');

program //
  .option('-f, --file <file>', 'path to the OpenAPI document')
  .option('-p, --port <port>', 'port number on which to run server', 8889)
  .option(
    '-w, --watch [watchLocation]',
    'watch for changes in a file/directory (falls back to the OpenAPI file) and restart server accordingly',
  )
  .option('-v, --verbose', 'show verbose output')
  .version('0.0.1')
  .parse(process.argv);

let server: http.Server;

if (program.verbose) {
  debugMod.enable('openapi-cop:mock');
}

// Validate CLI arguments
if (!program.file) {
  console.log('Did not provide a OpenAPI file path.\n');
  program.outputHelp();
  process.exit();
}

/**
 * Starts or restarts the express server.
 * @param restart - Used to log different messages when the server is restarted.
 */
async function start(restart = false) {
  const apiDocFile = path.resolve(program.file);
  try {
    server = await runApp({ port: program.port, apiDocFile });
  } catch (e) {
    process.exit();
  }

  if (!restart) {
    console.log(
      chalk.blue(
        `openapi-cop mock server is running at http://localhost:${program.port}`,
      ),
    );
  } else {
    console.log(chalk.hex('#eeeeee')('Restarted mock server'));
  }
}

// Start immediately
start();

// Watch for file changes and restart server
if (program.watch) {
  const watchLocation =
    typeof program.watch !== 'boolean' ? program.watch : program.file;
  const watcher = chokidar.watch(watchLocation, { persistent: true });
  console.log(chalk.blue(`Watching changes in '${watchLocation}'`));

  watcher.on('change', (path) => {
    console.log(
      chalk.hex('#eeeeee')(
        `Detected change in file ${path}. Restarting server...`,
      ),
    );
    server.close(() => {
      start(true);
    });
  });
}

// Close process gracefully
process.on('SIGTERM', () => {
  debug('Received SIGTERM signal to terminate process.');
  server.close(() => {
    process.exit();
  });

  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
