import {AxiosRequestConfig} from 'axios';
import * as http from 'http';


export interface TestRequestMap {
  [fileName: string]: Array<TestRequest>;
}

export type TestRequest = AxiosRequestConfig & { expectedError?: any };

export interface TestResponses {
  [fileName: string]: TestResponseConfig;
}

export type TestResponseConfig = Array<{
  request: TestRequest;
  serverFactory: () => http.Server;
  expectedError: any;
}>;
