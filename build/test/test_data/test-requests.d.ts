import { AxiosRequestConfig } from 'axios';
/**
 * NOTE: To enable tests for a specific OpenAPI file, add the file name
 * as a key of the object, and add at least one request to the array.
 */
export declare type TestRequestConfig = AxiosRequestConfig & {
    expectedError?: any;
};
export interface TestRequests {
    [fileName: string]: TestRequestConfig[];
}
/**
 * Maps a OpenAPI file by its name to an array of sample requests. The
 * requests are expected NOT to trigger a 404 response.
 */
export declare const VALID_TEST_REQUESTS: {
    [dir: string]: TestRequests;
};
export declare const STRICTLY_VALID_TEST_REQUESTS: {
    [dir: string]: TestRequests;
};
export declare const INVALID_TEST_REQUESTS: {
    [dir: string]: TestRequests;
};
export declare const STRICTLY_INVALID_TEST_REQUESTS: {
    [dir: string]: TestRequests;
};
