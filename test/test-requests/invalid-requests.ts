/**
 * NOTE: To enable tests for a specific OpenAPI file, add the file name
 * as a key of the object and add at least one TestRequestConfig to the array.
 */
import {TestRequestMap} from '../../types/test-request-map';

export const INVALID_TEST_REQUESTS: { [dir: string]: TestRequestMap } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({blurp: 'BLUUURP!'}),
        expectedError: {keyword: 'required'},
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cat?limit=nonsense',
        data: JSON.stringify({search: 'Garfield'}),
        expectedError: {keyword: 'type'},
      },
      {
        method: 'POST',
        url: '/pets/cat',
        data: '{}',
        expectedError: {keyword: 'required'},
      },
    ],
    '6-examples.yaml': [
      {
        method: 'GET',
        url: '/pets/cat',
        expectedError: {keyword: 'type'},
      },
    ],
  },
};

export const STRICTLY_INVALID_TEST_REQUESTS: { [dir: string]: TestRequestMap } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({input: 'Marco!', sponge: 'Bob'}),
        expectedError: {keyword: 'additionalProperties'},
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cat?limit=3&test=false',
        data: JSON.stringify({search: 'Dark Side of the Moon'}),
        expectedError: {keyword: 'additionalProperties'},
      },
    ],
  },
};
