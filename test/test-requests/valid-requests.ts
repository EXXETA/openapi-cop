/**
 * NOTE: To enable tests for a specific OpenAPI file, add the file name
 * as a key of the object and add at least one `TestRequestConfig` to the array.
 */
import {TestRequestMap} from 'test-request-map';

export const VALID_TEST_REQUESTS: { [dir: string]: TestRequestMap } = {
  v3: {
    '2-path.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({input: 'ECHO!'}),
      },
    ],
    '3-parameters.yaml': [
      {
        method: 'POST',
        url: '/pets/cats',
        data: JSON.stringify({search: 'Garfield'}),
      },
    ],
    '4-refs.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({input: 'ECHO!'}),
      },
    ],
    '5-external-refs.yaml': [
      {
        method: 'POST',
        url: '/echo',
        data: JSON.stringify({input: 'ECHO!'}),
      },
    ],
    '6-examples.yaml': [
      {method: 'GET', url: '/pets'},
      {
        method: 'POST',
        url: '/pets',
        data: JSON.stringify({search: 'Scooby'}),
      },
    ],
    '7-petstore.yaml': [
      {method: 'GET', url: '/pets'},
      {method: 'GET', url: '/pets/1'},
    ],
  },
};

export const STRICTLY_VALID_TEST_REQUESTS: { [dir: string]: TestRequestMap } = {
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
