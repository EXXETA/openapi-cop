/// <reference types="node" />
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ChildProcess } from 'child_process';
import { TestRequests, TestRequestConfig } from '../test_data/test-requests';
import { NonCompliantServerConfig } from '../test_data/test-target-servers';
/**
 * Formats a request in a compact way, i.e. METHOD /url {...}
 * Example:
 *     POST /echo {"input":"Marco!"}
 * @param req
 */
export declare function formatRequest(req: AxiosRequestConfig): string;
export declare function assertThrowsAsync(fn: () => void, regExp: RegExp): Promise<void>;
/**
 * Executes a function within the context of a proxy and a mock server.
 * Resources are created before execution and cleaned up thereafter.
 */
export declare function withServers({ apiDocFile, callback, defaultForbidAdditionalProperties, silent, }: {
    apiDocFile: string;
    callback: () => Promise<void>;
    defaultForbidAdditionalProperties: boolean;
    silent: boolean;
}): Promise<void>;
/**
 * For each OpenAPI file in a given directory, it boots a proxy and a mock
 * server and runs the provided test requests. It then executes the callback
 * function that contains the test code.
 */
export declare function testRequestForEachFile({ testTitle, dir, testRequests, client, callback, defaultForbidAdditionalProperties, silent, }: {
    testTitle: string;
    dir: string;
    testRequests: TestRequests;
    client: {
        proxy: AxiosInstance;
        target: AxiosInstance;
    };
    callback: (proxyRes: AxiosResponse, targetRes: AxiosResponse, fileName: string, requestObject: TestRequestConfig) => void;
    defaultForbidAdditionalProperties?: boolean;
    silent?: boolean;
}): void;
/**
 * Spawns a proxy server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export declare function spawnProxyServer(proxyPort: number, targetPort: number, apiDocFile: string, options?: any): Promise<ChildProcess>;
/**
 * Spawns a mock server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
export declare function spawnMockServer(port: number, apiDocFile: string, options?: any): Promise<ChildProcess>;
/**
 * Convenience function to spawn a proxy server along a mock server.
 */
export declare function spawnProxyWithMockServer(proxyPort: number, targetPort: number, apiDocFile: string, options?: any): Promise<{
    proxy: ChildProcess;
    target: ChildProcess;
}>;
/**
 * For each OpenAPI file in a given directory, it boots a proxy server, along
 * with a test target server and runs the provided test requests. It then
 * executes the callback function that contains the test code.
 */
export declare function testRequestForEachFileWithServers({ testTitle, dir, testServers, client, callback, defaultForbidAdditionalProperties, }: {
    testTitle: string;
    dir: string;
    testServers: {
        [fileName: string]: NonCompliantServerConfig;
    };
    client: {
        proxy: AxiosInstance;
        target: AxiosInstance;
    };
    defaultForbidAdditionalProperties?: boolean;
    callback: (proxyRes: AxiosResponse, targetRes: AxiosResponse, fileName: string, expectedError: any) => void;
}): void;
