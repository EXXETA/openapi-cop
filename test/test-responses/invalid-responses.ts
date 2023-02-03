import { Request, Response } from 'express';
import { TestResponses } from '../../types/test-request-map';
import { responderTo } from '../util/server';

/**
 * For every OpenAPI file path, an HTTP server is provided along with valid
 * requests that should nevertheless send a non-compliant response.
 *
 * If a OpenAPI file name is present, but the server array is empty, this is
 * seen as intentional and no tests are run for this OpenAPI document.
 */
export const INVALID_RESPONSES: {
  [dir: string]: TestResponses;
} = {
  v3: {
    '2-path.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        serverFactory: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(200).json({ itseMe: 'Mario!' });
          },
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
        serverFactory: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(400).json({ error: { name: 666, message: 42 } });
          },
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
        serverFactory: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res.status(400).json({ error: { name: 666, message: 42 } });
          },
        ),
        expectedError: { keyword: 'type' },
      },
    ],
    '6-examples.yaml': [
      {
        request: { method: 'GET', url: '/pets' },
        serverFactory: responderTo(
          'get',
          '/pets',
          (_req: Request, res: Response) => {
            res.status(200).json([{ id: 12, name: 'Figaro' }, 'rofl', 'lol']);
          },
        ),
        expectedError: { keyword: 'type', message: 'should be object' },
      },
    ],
    '7-petstore.yaml': [
      // Nothing to test
    ],
  },
};

/**
 * Expected invalid responses when the `--default-forbid-additional-properties` flag is set.
 */
export const STRICTLY_INVALID_RESPONSES: {
  [dir: string]: TestResponses;
} = {
  v3: {
    '2-path.yaml': [
      {
        request: {
          method: 'POST',
          url: '/echo',
          data: JSON.stringify({ input: 'ECHO!' }),
        },
        serverFactory: responderTo(
          'post',
          '/echo',
          (_req: Request, res: Response) => {
            res
              .status(200)
              .json({ output: 'The cake is a lie', forrest: 'Gump' });
          },
        ),
        expectedError: { keyword: 'additionalProperties' },
      },
    ],
  },
};
