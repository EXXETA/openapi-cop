/// <reference types="node" />
import * as http from 'http';
import { TestRequestConfig } from './test-requests';
export declare type NonCompliantServerConfig = Array<{
    request: TestRequestConfig;
    runServer: () => Promise<http.Server>;
    expectedError: any;
}>;
export interface NonCompliantServerConfigMap {
    [fileName: string]: NonCompliantServerConfig;
}
/**
 * For every OpenAPI file path, a HTTP server is provided along with valid
 * requests that should nevertheless send a non-compliant response.
 *
 * If a OpenAPI file name is present, but the server array is empty, this is
 * seen as intentional and no tests are run for this OpenAPI document.
 */
export declare const NON_COMPLIANT_SERVERS: {
    [dir: string]: NonCompliantServerConfigMap;
};
export declare const STRICTLY_NON_COMPLIANT_SERVERS: {
    [dir: string]: NonCompliantServerConfigMap;
};
