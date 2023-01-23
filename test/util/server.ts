import { ProxyOptions } from '../../src/app';
import { MOCK_SERVER_DIR } from '../config';
import { MockOptions } from '@exxeta/openapi-cop-mock-server';
import { buildCliArguments, CliFlags } from '../../src/util';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import * as waitOn from 'wait-on';
import debug from 'debug';

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
): Promise<ChildProcess> {
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
    { flag: '--verbose', value: true },
  ];

  const cp = spawn('node', ['../../src/cli.js', ...buildCliArguments(args)], {
    cwd: __dirname,
    stdio: 'pipe',
    detached: false,
    ...spawnOptions,
  });

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
): Promise<ChildProcess> {
  const args: Array<CliFlags> = [
    { flag: '--port', value: mockOptions.port.toString() },
    { flag: '--file', value: mockOptions.apiDocFile },
    { flag: '--verbose', value: true },
  ];

  const cp = spawn('node', ['./build/src/cli.js', ...buildCliArguments(args)], {
    cwd: MOCK_SERVER_DIR,
    stdio: debug.enabled('openapi-cop:mock') ? 'inherit' : 'ignore',
    detached: false,
    ...spawnOptions,
  });

  await waitOn({ resources: [`tcp:localhost:${mockOptions.port}`] });

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
