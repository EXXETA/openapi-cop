import {runProxy as runProxyApp} from '../../src/app';
import {MOCK_SERVER_DIR, PROXY_PORT, TARGET_SERVER_PORT} from '../config';
import {runApp as runMockApp} from '@exxeta/openapi-cop-mock-server';
import {closeServer} from '../../src/util';
import {ChildProcess, spawn} from 'child_process';
import * as waitOn from 'wait-on';
import debug from 'debug';

/**
 * Executes a function within the context of a proxy and a mock server.
 * Resources are created before execution and cleaned up thereafter.
 */
export async function withServers({
                                    apiDocPath,
                                    callback,
                                    defaultForbidAdditionalProperties,
                                    silent,
                                  }: {
  apiDocPath: string;
  callback: () => Promise<void>;
  defaultForbidAdditionalProperties: boolean;
  silent: boolean;
}): Promise<void> {
  console.log('Starting servers...');
  const servers = {
    proxy: await runProxyApp({
      port: PROXY_PORT,
      host: 'localhost',
      targetUrl: `http://localhost:${TARGET_SERVER_PORT}`,
      apiDocPath,
      defaultForbidAdditionalProperties,
      silent,
    }),
    mock: await runMockApp(TARGET_SERVER_PORT, apiDocPath),
  };

  console.log('Running test...');
  await callback();

  console.log('Shutting down servers...');
  await Promise.all([closeServer(servers.proxy), closeServer(servers.mock)]);
}

/**
 * Spawns a proxy server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export async function spawnProxyServer(
  proxyPort: number,
  targetPort: number,
  apiDocFile: string,
  options: any = {},
): Promise<ChildProcess> {
  // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
  const cp = spawn(
    'node',
    [
      '../../src/cli.js',
      '--port',
      proxyPort.toString(),
      '--target',
      `http://localhost:${targetPort}`,
      '--file',
      apiDocFile,
      '--verbose',
    ],
    {cwd: __dirname, stdio: 'pipe', detached: false, ...options},
  );

  await waitOn({resources: [`tcp:localhost:${proxyPort}`]});

  return cp;
}

/**
 * Spawns a mock server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export async function spawnMockServer(
  port: number,
  apiDocFile: string,
  options: any = {},
): Promise<ChildProcess> {
  // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
  const cp = spawn(
    'node',
    [
      './build/src/cli.js',
      '--port',
      port.toString(),
      '--file',
      apiDocFile,
      '--verbose',
    ],
    {
      cwd: MOCK_SERVER_DIR,
      stdio: debug.enabled('openapi-cop:mock') ? 'inherit' : 'ignore',
      detached: false,
      ...options,
    },
  );

  await waitOn({resources: [`tcp:localhost:${port}`]});

  return cp;
}

/**
 * Convenience function to spawn a proxy server along a mock server.
 */
export async function spawnProxyWithMockServer(
  proxyPort: number,
  targetPort: number,
  apiDocFile: string,
  options: any = {},
): Promise<{ proxy: ChildProcess; target: ChildProcess; }> {
  return {
    proxy: await spawnProxyServer(proxyPort, targetPort, apiDocFile, options),
    target: await spawnMockServer(targetPort, apiDocFile, options),
  };
}
