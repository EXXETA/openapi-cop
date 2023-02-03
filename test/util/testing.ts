import { TestRequest, TestRequestMap, TestResponses } from 'test-request-map';
import * as assert from 'assert';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ExtendedProxyOptions } from '../../src/app';
import { getFileName, readDirFilesSync } from './io';
import * as chalk from 'chalk';
import { ServerOrchestrator } from './server-orchestrator';
import { withServer } from './server';

/**
 * Formats a request in a compact way, i.e. METHOD /url {...}
 * Example:
 *     POST /echo {"input":"Marco!"}
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

export async function assertThrowsAsync(
  fn: () => Promise<void>,
  regExp: RegExp,
): Promise<void> {
  let f = () => {
    return;
  };
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

export type AssertionFunction = (
  proxyResponse: AxiosResponse,
  targetResponse: AxiosResponse,
  fileName: string,
  expectedError: any,
) => void;

/**
 * For each OpenAPI file in a given directory, it boots a proxy and a mock
 * server and runs the provided test requests. It then executes the callback
 * function that contains the test code.
 */
export function testRequestsForEachApiDoc(options: {
  testTitle: string;
  apiDocDirectory: string;
  testRequestMap: TestRequestMap;
  clients: { proxy: AxiosInstance; target: AxiosInstance };
  serverOrchestrator: ServerOrchestrator<any>;
  proxyOptions?: Partial<ExtendedProxyOptions>;
  test: AssertionFunction;
}): void {
  for (const apiDocPath of readDirFilesSync(options.apiDocDirectory)) {
    testRequestsForApiDoc({
      ...options,
      apiDocPath,
      testRequests: options.testRequestMap[getFileName(apiDocPath)] ?? [],
    });
  }
}

export function testRequestsForApiDoc({
  testTitle,
  apiDocPath,
  testRequests,
  clients,
  serverOrchestrator,
  proxyOptions,
  test,
}: {
  testTitle: string;
  apiDocPath: string;
  testRequests: Array<TestRequest>;
  clients: { proxy: AxiosInstance; target: AxiosInstance };
  serverOrchestrator: ServerOrchestrator<any>;
  proxyOptions?: Partial<ExtendedProxyOptions>;
  test: AssertionFunction;
}): void {
  const fileName = getFileName(apiDocPath);
  it(`${testTitle}: ${fileName}`, async function () {
    // Skip if no test requests exist for the OpenAPI definition
    if (testRequests.length === 0) {
      console.log(
        chalk.keyword('orange')(
          `Skipping '${fileName}' due to missing test requests.`,
        ),
      );
      return;
    }

    await serverOrchestrator.withServers({
      proxyOptions: { ...proxyOptions, apiDocPath },
      task: async () => {
        for (const request of testRequests) {
          console.log(`Sending request ${formatRequest(request)}`);
          const targetResponse = await clients.target(request);
          const proxyResponse = await clients.proxy(request);
          test(proxyResponse, targetResponse, fileName, request.expectedError);
        }
      },
    });
  });
}

export function testResponsesForEachApiDoc({
  testTitle,
  apiDocDirectory,
  testResponses,
  client,
  serverOrchestrator,
  proxyOptions,
  test,
}: {
  testTitle: string;
  apiDocDirectory: string;
  testResponses: TestResponses;
  client: { proxy: AxiosInstance; target: AxiosInstance };
  serverOrchestrator: ServerOrchestrator<any>;
  proxyOptions?: Partial<ExtendedProxyOptions>;
  test: AssertionFunction;
}): void {
  for (const apiDocPath of readDirFilesSync(apiDocDirectory)) {
    const fileName = getFileName(apiDocPath);
    it(`${testTitle}: ${fileName}`, async function () {
      const testData = testResponses[fileName];
      if (!testData?.length) {
        console.log(
          chalk.keyword('orange')(
            `Skipping '${fileName}' due to missing test responses.`,
          ),
        );
        return;
      }

      await serverOrchestrator.withProxy({
        proxyOptions: { ...proxyOptions, apiDocPath },
        task: async () => {
          for (const { request, serverFactory, expectedError } of testData) {
            await withServer({
              serverFactory,
              port: serverOrchestrator.targetUrl.port,
              task: async () => {
                console.log(`Sending request ${formatRequest(request)}`);
                const targetRes = await client.target(request);
                const proxyRes = await client.proxy(request);
                test(proxyRes, targetRes, apiDocPath, expectedError);
              },
            });
          }
        },
      });
    });
  }
}
