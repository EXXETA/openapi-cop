const debug = require('debug');
import chalk = require('chalk');
import * as assert from 'assert';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as waitOn from 'wait-on';

import { MOCK_SERVER_DIR, TARGET_SERVER_PORT, PROXY_PORT } from '../config';
import { TestRequests, TestRequestConfig } from '../test_data/test-requests';
import { runProxy as runProxyApp } from '../../src/app';
import { runApp as runMockApp } from 'openapi-cop-mock-server';
import { closeServer } from '../../src/util';
import { readDirFilesSync } from './io';
import { NonCompliantServerConfig } from '../test_data/test-target-servers';

/**
 * Formats a request in a compact way, i.e. METHOD /url {...}
 * Example:
 *     POST /echo {"input":"Marco!"}
 * @param req
 */
export function formatRequest(req: AxiosRequestConfig): string {
  const s = `${req.method} ${req.url}`;
  if (typeof req.data !== 'undefined') {
    const data =
      typeof req.data === 'string' ? req.data : JSON.stringify(req.data);
    return s + ' ' + data;
  } else {
    return s;
  }
}

export async function assertThrowsAsync(fn: () => void, regExp: RegExp) {
  let f = () => {};
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    assert.throws(f, regExp);
  }
}

/**
 * Executes a function within the context of a proxy and a mock server.
 * Resources are created before execution and cleaned up thereafter.
 */
export async function withServers({
  apiDocFile,
  callback,
  defaultForbidAdditionalProperties,
  silent,
}: {
  apiDocFile: string;
  callback: () => Promise<void>;
  defaultForbidAdditionalProperties: boolean;
  silent: boolean;
}) {
  console.log('Starting servers...');
  const servers = {
    proxy: await runProxyApp({
      port: PROXY_PORT,
      host: 'localhost',
      targetUrl: `http://localhost:${TARGET_SERVER_PORT}`,
      apiDocFile,
      defaultForbidAdditionalProperties,
      silent,
    }),
    mock: await runMockApp(TARGET_SERVER_PORT, apiDocFile),
  };

  console.log('Running test...');
  await callback();

  console.log('Shutting down servers...');
  await Promise.all([closeServer(servers.proxy), closeServer(servers.mock)]);
}

/**
 * For each OpenAPI file in a given directory, it boots a proxy and a mock
 * server and runs the provided test requests. It then executes the callback
 * function that contains the test code.
 */
export function testRequestForEachFile({
  testTitle,
  dir,
  testRequests,
  client,
  callback,
  defaultForbidAdditionalProperties = false,
  silent = false,
}: {
  testTitle: string;
  dir: string;
  testRequests: TestRequests;
  client: { proxy: AxiosInstance; target: AxiosInstance };
  callback: (
    proxyRes: AxiosResponse,
    targetRes: AxiosResponse,
    fileName: string,
    requestObject: TestRequestConfig,
  ) => void;
  defaultForbidAdditionalProperties?: boolean;
  silent?: boolean;
}) {
  // tslint:disable:only-arrow-functions
  for (const p of readDirFilesSync(dir)) {
    const fileName = path.normalize(path.basename(p)).replace(/\\/g, '/');
    it(`${testTitle}: ${fileName}`, async function() {
      // Skip if no test requests exist for the OpenAPI definition
      if (!(fileName in testRequests)) {
        console.log(
          chalk.keyword('orange')(
            `Skipping '${fileName}' due to missing test requests.`,
          ),
        );
        return;
      }

      await withServers({
        apiDocFile: p,
        defaultForbidAdditionalProperties,
        silent,
        async callback() {
          // Perform all test requests on both servers yield responses
          // to compare
          for (const req of testRequests[fileName]) {
            console.log(`Sending request ${formatRequest(req)}`);
            const targetRes = await client.target(req);
            const proxyRes = await client.proxy(req);
            callback(proxyRes, targetRes, fileName, req);
          }
        },
      });
    });
  }
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
    { cwd: __dirname, stdio: 'pipe', detached: false, ...options },
  );

  await waitOn({ resources: [`tcp:localhost:${proxyPort}`] });

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
) {
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

  await waitOn({ resources: [`tcp:localhost:${port}`] });

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
) {
  return {
    proxy: await spawnProxyServer(proxyPort, targetPort, apiDocFile, options),
    target: await spawnMockServer(targetPort, apiDocFile, options),
  };
}

/**
 * For each OpenAPI file in a given directory, it boots a proxy server, along
 * with a test target server and runs the provided test requests. It then
 * executes the callback function that contains the test code.
 */
export function testRequestForEachFileWithServers({
  testTitle,
  dir,
  testServers,
  client,
  callback,
  defaultForbidAdditionalProperties = false,
}: {
  testTitle: string;
  dir: string;
  testServers: { [fileName: string]: NonCompliantServerConfig };
  client: { proxy: AxiosInstance; target: AxiosInstance };
  defaultForbidAdditionalProperties?: boolean;
  callback: (
    proxyRes: AxiosResponse,
    targetRes: AxiosResponse,
    fileName: string,
    expectedError: any,
  ) => void;
}) {
  // tslint:disable:only-arrow-functions
  for (const apiDocFile of readDirFilesSync(dir)) {
    const fileName = path
      .normalize(path.basename(apiDocFile))
      .replace(/\\/g, '/');
    it(`${testTitle}: ${fileName}`, async function() {
      if (!(fileName in testServers)) {
        console.log(
          chalk.keyword('orange')(
            `Skipping '${fileName}' due to missing test target server.`,
          ),
        );
        return;
      }

      if (testServers[fileName].length === 0) {
        // When no tests are present in the array, this is interpreted as an
        // intentional skip
        return;
      }

      console.log('Starting proxy server...');
      const proxyServer = await runProxyApp({
        port: PROXY_PORT,
        host: 'localhost',
        targetUrl: `http://localhost:${TARGET_SERVER_PORT}`,
        apiDocFile,
        defaultForbidAdditionalProperties,
      });

      console.log('Running test...');
      for (const { request, runServer, expectedError } of testServers[
        fileName
      ]) {
        console.log('Starting some mock server...');
        const mockServer = await runServer();

        console.log(`Sending request ${formatRequest(request)}`);
        const targetRes = await client.target(request);
        const proxyRes = await client.proxy(request);

        callback(proxyRes, targetRes, fileName, expectedError);

        console.log('Shutting down mock server...');
        await closeServer(mockServer);
      }

      console.log('Shutting down proxy server...');
      await closeServer(proxyServer);
    });
  }
}
