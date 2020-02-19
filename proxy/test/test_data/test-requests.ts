import { AxiosRequestConfig } from 'axios';
/**
 * NOTE: To enable tests for a specific OpenAPI file, add the file name
 * as a key of the object, and add at least one request to the array.
 */

export type TestRequestConfig = AxiosRequestConfig & { expectedError?: any };

// A set of test request for a specific API
export interface TestRequests {
  [fileName: string]: TestRequestConfig[];
}

/**
 * Maps a OpenAPI file by its name to an array of sample requests. The
 * requests are expected NOT to trigger a 404 response.
 */
export const VALID_TEST_REQUESTS: { [dir: string]: TestRequests } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({ input: 'ECHO!' }),
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cats',
        data: JSON.stringify({ search: 'Garfield' }),
      },
    ],
    '4-refs.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({ input: 'ECHO!' }),
      },
    ],
    '5-external-refs.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({ input: 'ECHO!' }),
      },
    ],
    '6-examples.yaml': [
      { method: 'GET', url: '/pets' },
      {
        method: 'POST',
        url: '/pets',
        data: JSON.stringify({ search: 'Scooby' }),
      },
    ],
    '7-petstore.yaml': [
      { method: 'GET', url: '/pets' },
      { method: 'GET', url: '/pets/1' },
    ],
  },
};

export const STRICTLY_VALID_TEST_REQUESTS: { [dir: string]: TestRequests } = {
  v3: {
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cats',
        // request contains an additional property, but the OpenAPI document
        // explicitly allows it, so it should pass
        data: JSON.stringify({
          search: 'Is anybody in there?',
          strict: false,
          watson: 'Sherlock!',
        }),
      },
    ],
  },
};

export const INVALID_TEST_REQUESTS: { [dir: string]: TestRequests } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({ blurp: 'BLUUURP!' }),
        expectedError: { keyword: 'required' },
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cat?limit=nonsense',
        data: JSON.stringify({ search: 'Garfield' }),
        expectedError: { keyword: 'type' },
      },
      {
        method: 'POST',
        url: '/pets/cat',
        data: '{}',
        expectedError: { keyword: 'required' },
      },
    ],
    '6-examples.yaml': [
      { method: 'GET', url: '/pets/cat', expectedError: { keyword: 'type' } },
    ],
  },
};

export const STRICTLY_INVALID_TEST_REQUESTS: { [dir: string]: TestRequests } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({ input: 'Marco!', sponge: 'Bob' }),
        expectedError: { keyword: 'additionalProperties' },
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cat?limit=3&test=false',
        data: JSON.stringify({ search: 'Dark Side of the Moon' }),
        expectedError: { keyword: 'additionalProperties' },
      },
    ],
  },
};
