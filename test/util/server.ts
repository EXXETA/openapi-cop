import { BaseProxyOptions, ProxyOptions } from '../../src/app';
import { MOCK_SERVER_DIR, SCHEMAS_DIR, TARGET_SERVER_PORT } from '../config';
import { BaseMockOptions, MockOptions } from '@exxeta/openapi-cop-mock-server';
import { buildCliArguments, CliFlags } from '../../src/util';
import { ChildProcess, execFile, spawn, SpawnOptions } from 'child_process';
import * as waitOn from 'wait-on';
import debug from 'debug';
import * as path from 'path';
import * as http from 'http';
import { Server } from 'http';
import * as express from 'express';

function toProxyCliOptions(proxyOptions: ProxyOptions, isVerbose = false) {
  const args: Array<CliFlags> = [
    { flag: '--host', value: proxyOptions.host },
    { flag: '--port', value: proxyOptions.port.toString() },
    { flag: '--target', value: proxyOptions.targetUrl },
    { flag: '--file', value: proxyOptions.apiDocPath },
    {
      flag: '--default-forbid-additional-properties',
      value: proxyOptions.defaultForbidAdditionalProperties,
    },
    { flag: '--silent', value: proxyOptions.silent },
    { flag: '--verbose', value: isVerbose },
  ];

  return buildCliArguments(args);
}

function toMockCliOptions(mockOptions: MockOptions, isVerbose = false) {
  const args: Array<CliFlags> = [
    { flag: '--port', value: mockOptions.port.toString() },
    { flag: '--file', value: mockOptions.apiDocFile },
    { flag: '--verbose', value: isVerbose },
  ];

  return buildCliArguments(args);
}

/**
 * Spawns a proxy server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export async function spawnProxyServer(
  proxyOptions: ProxyOptions,
  // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
  spawnOptions: SpawnOptions = {},
  isVerbose = false,
): Promise<ChildProcess> {
  const cp = spawn(
    'node',
    ['../../src/cli.js', ...toProxyCliOptions(proxyOptions, isVerbose)],
    {
      cwd: __dirname,
      stdio: 'pipe',
      detached: false,
      ...spawnOptions,
    },
  );

  await waitOn({
    resources: [`tcp:${proxyOptions.host}:${proxyOptions.port}`],
  });

  return cp;
}

/**
 * Spawns a mock server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export async function spawnMockServer(
  mockOptions: MockOptions,
  // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
  spawnOptions: SpawnOptions = {},
  isVerbose = false,
): Promise<ChildProcess> {
  const cp = spawn(
    'node',
    ['./build/src/cli.js', ...toMockCliOptions(mockOptions, isVerbose)],
    {
      cwd: MOCK_SERVER_DIR,
      stdio: debug.enabled('openapi-cop:mock') ? 'inherit' : 'ignore',
      detached: false,
      ...spawnOptions,
    },
  );

  await waitOn({ resources: [`tcp:${mockOptions.port}`] });

  return cp;
}

/**
 * Convenience function to spawn a proxy server along a mock server.
 */
export async function spawnProxyWithMockServer(
  proxyOptions: ProxyOptions,
  mockOptions: MockOptions,
  spawnOptions: SpawnOptions = {},
): Promise<{ proxy: ChildProcess; target: ChildProcess }> {
  return {
    proxy: await spawnProxyServer(proxyOptions, spawnOptions),
    target: await spawnMockServer(mockOptions, spawnOptions),
  };
}

export async function spawnDockerProxyServer(
  proxyOptions: ProxyOptions,
  // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
  spawnOptions: SpawnOptions = {},
  isVerbose = false,
): Promise<ChildProcess> {
  const dockerProxyOptions = {
    ...proxyOptions,
    apiDocPath: path.join(
      '/schemas',
      path.relative(SCHEMAS_DIR, proxyOptions.apiDocPath),
    ),
  };

  const cp = spawn(
    'test/docker/run-docker-test.bash',
    [toProxyCliOptions(dockerProxyOptions, isVerbose).join(' ')],
    {
      cwd: process.env.PWD,
      stdio: 'pipe',
      detached: false,
      ...spawnOptions,
    },
  );

  await waitOn({
    resources: [`tcp:${proxyOptions.host}:${proxyOptions.port}`],
    timeout: 5000,
  });

  return cp;
}

export async function killDockerProxyServer(
  proxyOptions: BaseProxyOptions,
): Promise<ChildProcess> {
  const cp = execFile('test/docker/kill-docker-test.bash', {
    cwd: process.env.PWD,
  });

  await waitOn({
    resources: [`tcp:${proxyOptions.host}:${proxyOptions.port}`],
    reverse: true,
  });

  return cp;
}

/**
 * Utility function to create a server that responds to only one given path/method.
 */
export function responderTo(
  method: string,
  path: string,
  routeHandler: express.RequestHandler,
): (port: number | string) => http.Server {
  return (port: number | string) => {
    const app: express.Application = express();
    ((app as any)[method] as express.IRouterMatcher<any>)(path, routeHandler);
    return app.listen(port);
  };
}

export async function withServer({
  serverFactory,
  port,
  task,
}: {
  serverFactory: (port: number | string) => Server;
  port: number | string,
  task: () => Promise<void>;
}): Promise<void> {
  const server = await serverFactory(port);
  await task();
  await closeServer(server, port);
}

/** Closes the server and waits until the port is again free. */
export async function closeServer(
  server: http.Server,
  port: number | string,
): Promise<void> {
  if (server.address()) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  await waitOn({ resources: [`tcp:${port}`], reverse: true });
}
