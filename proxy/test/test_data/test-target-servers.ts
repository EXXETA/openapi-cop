import * as express from 'express';
import { Request, Response } from 'express';
import * as http from 'http';

import { TARGET_SERVER_PORT } from '../config';
import { TestRequestConfig } from './test-requests';

export type NonCompliantServerConfig = Array<{
  request: TestRequestConfig;
  runServer: () => Promise<http.Server>;
  expectedError: any;
}>;

export interface NonCompliantServerConfigMap {
  [fileName: string]: NonCompliantServerConfig;
}

function responderTo(
  method: string,
  path: string,
  routeHandler: express.RequestHandler
) {
  return async () => {
    const app: express.Application = express();
    ((app as any)[method] as express.IRouterMatcher<any>)(path, routeHandler);
    return app.listen(TARGET_SERVER_PORT);
  };
}

/**
 * For every OpenAPI file path, a HTTP server is provided along with valid
 * requests that should nevertheless send a non-compliant response.
 *
 * If a OpenAPI file name is present, but the server array is empty, this is
 * seen as intentional and no tests are run for this OpenAPI document.
 */
export const NON_COMPLIANT_SERVERS: {
  [dir: string]: NonCompliantServerConfigMap;
} = {
  v3: {
    '2-path.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        runServer: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(200).json({ itseMe: 'Mario!' });
          }
        ),
        expectedError: {
          keyword: 'required',
          params: { missingProperty: 'output' },
        },
      },
    ],
    '3-parameters.yaml': [
      // Nothing to test
    ],
    '4-refs.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        runServer: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(400).json({ error: { name: 666, message: 42 } });
          }
        ),
        expectedError: { keyword: 'type' },
      },
    ],
    '5-external-refs.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        runServer: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(400).json({ error: { name: 666, message: 42 } });
          }
        ),
        expectedError: { keyword: 'type' },
      },
    ],
    '6-examples.yaml': [
      {
        request: { method: 'GET', url: '/pets' },
        runServer: responderTo(
          'get',
          '/pets',
          (_req: Request, res: Response) => {
            res.status(200).json([{ id: 12, name: 'Figaro' }, 'rofl', 'lol']);
          }
        ),
        expectedError: { keyword: 'type', message: 'should be object' },
      },
    ],
    '7-petstore.yaml': [
      // Nothing to test
    ],
  },
};

export const STRICTLY_NON_COMPLIANT_SERVERS: {
  [dir: string]: NonCompliantServerConfigMap;
} = {
  v3: {
    '2-path.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        runServer: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res
              .status(200)
              .json({ output: 'The cake is a lie', forrest: 'Gump' });
          }
        ),
        expectedError: { keyword: 'additionalProperties' },
      },
    ],
  },
};
