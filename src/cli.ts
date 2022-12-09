#!/usr/bin/env node
import {URL} from "url";

const debugMod = require('debug');
const debug = debugMod('openapi-cop:proxy');
debug.log = console.log.bind(console); // output to stdout
import chalk = require('chalk');
import * as chokidar from 'chokidar';
import * as program from 'commander';
import * as http from 'http';
import * as path from 'path';
import * as npmPackage from '../package.json';

import { runProxy } from './app';

// Rename for consistent display of package name in help output
process.argv[1] = path.join(process.argv[1], 'openapi-cop');

program //
  .option('-s, --file <file>', 'path to the OpenAPI definition file')
  .option('-h, --host <host>', 'the host of the proxy server', 'localhost')
  .option('-p, --port <port>', 'port number on which to run the proxy', 8888)
  .option(
    '-t, --target <target>',
    'full base path of the target API (format: http(s)://host:port/basePath)',
  )
  .option(
    '--default-forbid-additional-properties',
    'disallow additional properties when not explicitly specified',
  )
  .option(
    '--silent',
    'do not send responses with validation errors, just set validation headers',
  )
  .option(
    '-w, --watch [watchLocation]',
    'watch for changes in a file or directory (falls back to the OpenAPI file) and restart server accordingly',
  )
  .option('-v, --verbose', 'show verbose output')
  .version(npmPackage.version ?? '?')
  .parse(process.argv);

let server: http.Server;

if (program.verbose) {
  debugMod.enable('openapi-cop:proxy');
}

// Validate CLI arguments
if (!program.file) {
  console.error('Did not provide a OpenAPI file path.\n');
  program.outputHelp();
  process.exit();
}

if (!program.target) {
  console.error('Did not provide a target server URL.\n');
  program.outputHelp();
  process.exit();
}

const targetUrl = new URL(program.target);

const defaultPorts: { [key: string]: number } = {
  'http:': 80,
  'https:': 443
}
const targetPort = (targetUrl.port !== '')? Number(targetUrl.port) : defaultPorts[targetUrl.protocol];

if ((targetUrl.hostname === 'localhost' || targetUrl.hostname === '0.0.0.0') && Number(program.port) === targetPort) {
  console.error('Cannot proxy to the same local port: ' + program.port);
  process.exit();
}

/**
 * Starts or restarts the express server.
 * @param restart - Used to log different messages when the server is restarted.
 */
async function start(restart = false): Promise<void> {
  try {
    server = await runProxy({
      port: program.port,
      host: program.host,
      targetUrl: program.target,
      apiDocPath: program.file,
      defaultForbidAdditionalProperties:
        program.defaultForbidAdditionalProperties,
      silent: program.silent,
    });
  } catch (e) {
    process.exit();
  }

  if (!restart) {
    const silentFlagText = program.silent ? '' : ' (failing responses when invalid)';
    console.log(chalk.blue(`Proxy at   http://${chalk.bold(`${program.host}:${program.port}`)}${silentFlagText}`));
    console.log(chalk.blue('Target at  ' + chalk.bold(program.target)));
  } else {
    console.log(chalk.hex('#eeeeee')('Restarted proxy server'));
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

  watcher.on('change', path => {
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
