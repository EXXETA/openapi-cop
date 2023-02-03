// tslint:disable: only-arrow-functions

import { assert } from 'chai';
import * as path from 'path';

import {
  INVALID_TEST_REQUESTS,
  STRICTLY_INVALID_TEST_REQUESTS,
} from './test-requests/invalid-requests';
import {
  INVALID_RESPONSES,
  STRICTLY_INVALID_RESPONSES,
} from './test-responses/invalid-responses';
import {
  AssertionFunction,
  testRequestsForApiDoc,
  testRequestsForEachApiDoc,
  testResponsesForEachApiDoc,
} from './util/testing';
import {
  DEFAULT_OPENAPI_FILE,
  PROXY_PORT,
  SCHEMAS_DIR,
  SERVER_RUNTIME,
  TARGET_SERVER_PORT,
} from './config';
import axios, { AxiosRequestConfig } from 'axios';
import {
  STRICTLY_VALID_TEST_REQUESTS,
  VALID_TEST_REQUESTS,
} from './test-requests/valid-requests';
import {
  DockerServerOrchestrator,
  NodeHttpServerOrchestrator,
  ServerOrchestrator,
} from './util/server-orchestrator';
import { URL } from 'url';
import { Server } from 'http';
import { ChildProcess } from 'child_process';

let serverOrchestrator: ServerOrchestrator<Server | ChildProcess>;
if (SERVER_RUNTIME === 'docker') {
  serverOrchestrator = new DockerServerOrchestrator(
    new URL(`http://0.0.0.0:${PROXY_PORT}`),
    new URL(`http://0.0.0.0:${TARGET_SERVER_PORT}`),
  );
} else {
  serverOrchestrator = new NodeHttpServerOrchestrator(
    new URL(`http://localhost:${PROXY_PORT}`),
    new URL(`http://localhost:${TARGET_SERVER_PORT}`),
  );
}

describe('integration.test.js', function() {
  this.slow(1000 * 15); // 15 seconds

  const contentType = 'application/json';
  const clients = {
    proxy: axios.create({
      baseURL: `http://localhost:${PROXY_PORT}`,
      headers: { 'content-type': contentType },
      validateStatus: () => true,
    }),
    target: axios.create({
      baseURL: `http://localhost:${TARGET_SERVER_PORT}`,
      headers: { 'content-type': contentType },
      validateStatus: () => true,
    }),
  };

  before(function() {
    console.log('Killing existing processes...');
    return serverOrchestrator.kill();
  });

  describe('OpenAPI v3', function() {
    const schemasDirV3 = path.join(SCHEMAS_DIR, 'v3');

    describe('Invariance tests', function() {
      testRequestsForEachApiDoc({
        testTitle:
          'should return the same status and response bodies as the target server in silent mode',
        apiDocDirectory: schemasDirV3,
        testRequestMap: VALID_TEST_REQUESTS.v3,
        clients,
        serverOrchestrator,
        proxyOptions: { silent: true },
        test: (proxyRes, targetRes) => {
          assert.deepStrictEqual(proxyRes.data, targetRes.data);
          assert.equal(proxyRes.status, targetRes.status);
        },
      });

      testRequestsForEachApiDoc({
        testTitle:
          'should return the same headers as the target server except from the openapi-cop headers in silent mode',
        apiDocDirectory: schemasDirV3,
        testRequestMap: VALID_TEST_REQUESTS.v3,
        clients,
        serverOrchestrator,
        proxyOptions: { silent: true },
        test: (proxyRes, targetRes) => {
          assert.property(proxyRes.headers, 'openapi-cop-validation-result');
          assert.property(proxyRes.headers, 'openapi-cop-source-request');
          delete proxyRes.headers['openapi-cop-validation-result'];
          delete proxyRes.headers['openapi-cop-source-request'];
          // ignore date header
          delete proxyRes.headers['date'];
          delete targetRes.headers['date'];

          assert.deepStrictEqual(
            proxyRes.headers,
            targetRes.headers,
            'Actual is proxy, expected is target',
          );
        },
      });
    });

    {
      let headerTestRequest: AxiosRequestConfig;
      testRequestsForApiDoc({
        testTitle:
          'should return the source request object inside the response header',
        apiDocPath: DEFAULT_OPENAPI_FILE,
        testRequests: [
          (headerTestRequest = {
            method: 'GET',
            url: '/pets',
            data: JSON.stringify({ search: 'something' }),
          }),
        ],
        clients,
        serverOrchestrator,
        proxyOptions: { silent: true },
        test: (proxyResponse) => {
          const openapiCopRequest = JSON.parse(
            proxyResponse.headers['openapi-cop-source-request'],
          );

          assert.deepStrictEqual(openapiCopRequest, {
            method: headerTestRequest.method,
            path: headerTestRequest.url,
            body: JSON.parse(headerTestRequest.data),
            query: {},
            headers: {
              accept: 'application/json, text/plain, */*',
              connection: 'close',
              'content-length': '22',
              'content-type': 'application/json',
              host: 'localhost:8888',
              'user-agent': 'axios/0.19.2',
            },
          });
        },
      });
    }

    testRequestsForEachApiDoc({
      testTitle:
        'should respond with validation headers that are ValidationResult',
      apiDocDirectory: schemasDirV3,
      testRequestMap: VALID_TEST_REQUESTS.v3,
      clients,
      serverOrchestrator,
      test: (proxyRes) => {
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const validationResultsKeys = [
          'request',
          'response',
          'responseHeaders',
        ];
        assert.hasAllKeys(validationResults, validationResultsKeys);
        for (const k of validationResultsKeys) {
          assert.isObject(
            validationResults[k],
            `validation results should contain key '${k}'`,
          );
          assert.hasAllKeys(validationResults[k], ['valid', 'errors']);
          assert.isBoolean(validationResults[k]['valid']);
          assert(
            validationResults[k]['errors'] === null ||
            Array.isArray(validationResults[k]['errors']),
            'validation error should be null or an array',
          );
          if (Array.isArray(validationResults[k]['errors'])) {
            const validKeys = [
              'keyword',
              'dataPath',
              'schemaPath',
              'params',
              'message',
              'propertyName',
              'schema',
              'parentSchema',
              'data',
            ];
            validationResults[k]['errors'].forEach((err: any) => {
              assert(
                Object.keys(err).every((k) => validKeys.includes(k)), // all keys are valid keys
                'validation error elements should conform with Ajv.ValidationError',
              );
            });
          }
        }
      },
    });

    it('should fail when target server is not available', async function() {
      this.timeout(10000);

      await serverOrchestrator.withProxy({
        proxyOptions: { apiDocPath: DEFAULT_OPENAPI_FILE },
        task: async () => {
          const proxyResponse = await clients.proxy.request({
            method: 'GET',
            url: '/pets',
          });
          assert.equal(proxyResponse.status, 500);
          assert.isTrue(proxyResponse.data.includes('ECONNREFUSED'));

          const validationResults = JSON.parse(
            proxyResponse.headers['openapi-cop-validation-result'],
          );

          assert.hasAllKeys(validationResults, ['request']);
          assert.doesNotHaveAnyKeys(validationResults, ['response']);
        },
      });
    });

    const assertDoesNotHaveValidationErrors: AssertionFunction = (proxyRes) => {
      const validationResults = JSON.parse(
        proxyRes.headers['openapi-cop-validation-result'],
      );
      const reqValidationResults = validationResults['request'];
      assert.isTrue(reqValidationResults['valid']);
      assert.isNull(reqValidationResults['errors']);
    };

    const assertHasRequestValidationError: AssertionFunction = (
      proxyResponse,
      targetResponse,
      fileName,
      expectedError,
    ) => {
      if (!expectedError) {
        throw new Error(
          'Bad test: "expectedError" property should be set for test requests that check for validation errors',
        );
      }
      const validationResults = JSON.parse(
        proxyResponse.headers['openapi-cop-validation-result'],
      );
      const reqValidationResults = validationResults['request'];
      assert.isNotTrue(reqValidationResults['valid']);
      assert.isNotNull(reqValidationResults['errors']);
      assert.isArray(reqValidationResults['errors']);
      assert.lengthOf(reqValidationResults['errors'], 1);
      for (const k of Object.keys(expectedError)) {
        assert.deepEqual(reqValidationResults['errors'][0][k], expectedError[k]);
      }
    };

    const assertHasResponseValidationErrors: AssertionFunction = (
      proxyRes,
      targetRes,
      fileName,
      expectedError,
    ) => {
      if (!expectedError) {
        throw new Error(
          'Bad test: "expectedError" property should be set for test requests that check for validation errors',
        );
      }
      const validationResults = JSON.parse(
        proxyRes.headers['openapi-cop-validation-result'],
      );
      const resValidationResults = validationResults['response'];
      assert.isNotTrue(resValidationResults['valid'], 'Response should be invalid');
      assert.isNotNull(
        resValidationResults['errors'],
        'There should be at least one error present',
      );
      assert.isArray(resValidationResults['errors']);
      for (const k of Object.keys(expectedError)) {
        assert.deepEqual(resValidationResults['errors'][0][k], expectedError[k]);
      }
    };

    testRequestsForEachApiDoc({
      testTitle: 'should NOT return any validation errors for valid requests',
      apiDocDirectory: schemasDirV3,
      testRequestMap: VALID_TEST_REQUESTS.v3,
      clients,
      serverOrchestrator,
      test: assertDoesNotHaveValidationErrors,
    });

    testRequestsForEachApiDoc({
      testTitle:
        'should NOT return any validation errors for strictly valid requests',
      apiDocDirectory: schemasDirV3,
      testRequestMap: STRICTLY_VALID_TEST_REQUESTS.v3,
      clients,
      serverOrchestrator,
      test: assertDoesNotHaveValidationErrors,
    });

    testRequestsForEachApiDoc({
      testTitle: 'should return correct validation errors for invalid requests',
      apiDocDirectory: schemasDirV3,
      testRequestMap: INVALID_TEST_REQUESTS.v3,
      clients,
      serverOrchestrator,
      test: assertHasRequestValidationError,
    });

    testResponsesForEachApiDoc({
      testTitle:
        'should return correct validation errors for invalid responses',
      apiDocDirectory: schemasDirV3,
      testResponses: INVALID_RESPONSES.v3,
      client: clients,
      serverOrchestrator,
      test: assertHasResponseValidationErrors,
    });

    testRequestsForEachApiDoc({
      testTitle:
        'should return correct validation errors for strictly invalid requests',
      apiDocDirectory: schemasDirV3,
      testRequestMap: STRICTLY_INVALID_TEST_REQUESTS.v3,
      clients,
      serverOrchestrator,
      proxyOptions: { defaultForbidAdditionalProperties: true },
      test: assertHasRequestValidationError,
    });

    testResponsesForEachApiDoc({
      testTitle:
        'should return correct validation errors for strictly invalid responses',
      apiDocDirectory: schemasDirV3,
      testResponses: STRICTLY_INVALID_RESPONSES.v3,
      client: clients,
      serverOrchestrator,
      proxyOptions: { defaultForbidAdditionalProperties: true },
      test: assertHasResponseValidationErrors,
    });
  });
});
