// tslint:disable: only-arrow-functions

/**
 * NOTE: When debugging test cases, make use of the script "dev-mock"
 * to spawn a proxy server along with a mock server using a specified
 * OpenAPI file, e.g.
 *
 *    npm run dev-mock -- "./schemas/v3/3-parameters.yaml"
 *
 * Afterwards, you can use curl to reproduce the requests.
 */

import { assert } from 'chai';
import * as path from 'path';

import {
  INVALID_TEST_REQUESTS,
  STRICTLY_INVALID_TEST_REQUESTS,
  STRICTLY_VALID_TEST_REQUESTS,
  VALID_TEST_REQUESTS,
} from './test_data/test-requests';
import {
  NON_COMPLIANT_SERVERS,
  STRICTLY_NON_COMPLIANT_SERVERS,
} from './test_data/test-target-servers';
import { killProcesses } from './util/process';
import {
  spawnProxyServer,
  testRequestForEachFile,
  testRequestForEachFileWithServers,
} from './util/testing';

import findProcess = require('find-process');
import {
  PROXY_PORT,
  TARGET_SERVER_PORT,
  SCHEMAS_DIR,
  DEFAULT_OPENAPI_FILE,
} from './config';
import { ChildProcess } from 'child_process';
import { Readable } from 'stream';
import axios from 'axios';
import { runProxy } from '../src/app';
import { closeServer } from '../src/util';

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

  before(async function() {
    // Kill active processes listening on any of the given ports
    const pid1 = await findProcess('port', PROXY_PORT);
    const pid2 = await findProcess('port', TARGET_SERVER_PORT);

    await killProcesses([
      ...pid1.filter(p => p.cmd.indexOf('node') !== -1).map(p => p.pid),
      ...pid2.filter(p => p.cmd.indexOf('node') !== -1).map(p => p.pid),
    ]);
  });

  describe('OpenAPI v3', function() {
    const schemasDirV3 = path.join(SCHEMAS_DIR, 'v3');

    describe('Invariance tests', function() {
      testRequestForEachFile({
        testTitle:
          'should return the same status and response bodies as the target server in silent mode',
        dir: schemasDirV3,
        testRequests: VALID_TEST_REQUESTS.v3,
        client: clients,
        silent: true,
        callback(proxyRes, targetRes) {
          assert.deepStrictEqual(proxyRes.data, targetRes.data);
          assert.equal(proxyRes.status, targetRes.status);
        },
      });

      testRequestForEachFile({
        testTitle:
          'should return the same headers as the target server except from the openapi-cop headers in silent mode',
        dir: schemasDirV3,
        testRequests: VALID_TEST_REQUESTS.v3,
        client: clients,
        silent: true,
        callback(proxyRes, targetRes) {
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

    it('should return the source request object inside the response header', async function() {
      console.log('Starting proxy server...');
      const server = await runProxy({
        port: PROXY_PORT,
        host: 'localhost',
        targetUrl: `http://localhost:${TARGET_SERVER_PORT}`,
        apiDocFile: DEFAULT_OPENAPI_FILE,
        defaultForbidAdditionalProperties: false,
      });

      const originalRequest = {
        method: 'GET',
        url: '/pets',
        data: JSON.stringify({ search: 'something' }),
      };

      const proxyResponse = await clients.proxy.request(originalRequest);

      const openapiCopRequest = JSON.parse(
        proxyResponse.headers['openapi-cop-source-request'],
      );

      assert.deepStrictEqual(openapiCopRequest, {
        method: originalRequest.method,
        path: originalRequest.url,
        body: JSON.parse(originalRequest.data),
        query: {},
        headers: {
          accept: 'application/json, text/plain, */*',
          connection: 'close',
          'content-length': '22',
          'content-type': 'application/json',
          host: 'localhost:8888',
          'user-agent': 'axios/0.18.1',
        },
      });

      await closeServer(server);
    });

    testRequestForEachFile({
      testTitle:
        'should respond with validation headers that are ValidationResult',
      dir: schemasDirV3,
      testRequests: VALID_TEST_REQUESTS.v3,
      client: clients,
      callback(proxyRes, _targetRes) {
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
                Object.keys(err).every(k => validKeys.includes(k)), // all keys are valid keys
                'validation error elements should conform with Ajv.ValidationError',
              );
            });
          }
        }
      },
    });

    it('should fail when target server is not available', async function() {
      this.timeout(10000);

      console.log('Starting proxy server...');
      const ps: ChildProcess = await spawnProxyServer(
        PROXY_PORT,
        TARGET_SERVER_PORT,
        DEFAULT_OPENAPI_FILE,
      );

      console.log('Reading output');

      let output = '';
      (ps.stdout as Readable).on('data', (data: Buffer) => {
        output += data;

        if (data.toString().includes('Proxying client request')) {
          setTimeout(() => {
            ps.kill();
          }, 1500);
        }
      });

      clients.proxy.request({ method: 'GET', url: '/pets' });

      return new Promise((resolve, reject) => {
        ps.on('exit', (code: number, signal: string) => {
          assert.notEqual(code, -1);
          assert.isTrue(
            output.includes('Validation results'),
            'should yield validation results',
          );
          assert.isTrue(
            output.includes('Target server is unreachable'),
            'should show failure to communicate with the target server',
          );
          resolve();
        });
      });
    });

    testRequestForEachFile({
      testTitle: 'should NOT return any validation errors for valid REQuests',
      dir: schemasDirV3,
      testRequests: VALID_TEST_REQUESTS.v3,
      client: clients,
      callback(proxyRes, _targetRes, fileName, requestObject) {
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const reqValidationResults = validationResults['request'];
        assert.isTrue(reqValidationResults['valid']);
        assert.isNull(reqValidationResults['errors']);
      },
    });

    testRequestForEachFile({
      testTitle:
        'should NOT return any validation errors for strictly valid REQuests',
      dir: schemasDirV3,
      testRequests: STRICTLY_VALID_TEST_REQUESTS.v3,
      client: clients,
      callback(proxyRes, _targetRes, fileName, requestObject) {
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const reqValidationResults = validationResults['request'];
        assert.isTrue(reqValidationResults['valid']);
        assert.isNull(reqValidationResults['errors']);
      },
    });

    testRequestForEachFile({
      testTitle: 'should return correct validation errors for invalid REQuests',
      dir: schemasDirV3,
      testRequests: INVALID_TEST_REQUESTS.v3,
      client: clients,
      callback(proxyRes, _targetRes, fileName, requestObject) {
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const reqValidationResults = validationResults['request'];
        assert.isNotTrue(reqValidationResults['valid']);
        assert.isNotNull(reqValidationResults['errors']);
        assert.isArray(reqValidationResults['errors']);
        assert.lengthOf(reqValidationResults['errors'], 1);
        assert.isDefined(
          requestObject.expectedError,
          '"expectedError" property should be set for test requests that check for validation errors',
        );
        for (const k of Object.keys(requestObject.expectedError)) {
          assert.deepEqual(
            reqValidationResults['errors'][0][k],
            requestObject.expectedError[k],
          );
        }
      },
    });

    testRequestForEachFileWithServers({
      testTitle:
        'should return correct validation errors for invalid RESponses',
      dir: schemasDirV3,
      testServers: NON_COMPLIANT_SERVERS.v3,
      client: clients,
      callback(proxyRes, targetRes, fileName, expectedError) {
        assert.isDefined(
          expectedError,
          '"expectedError" property should be set for test requests that check for validation errors',
        );
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const resValidationResults = validationResults['response'];
        assert.isNotTrue(
          resValidationResults['valid'],
          'Response should be invalid',
        );
        assert.isNotNull(
          resValidationResults['errors'],
          'There should be at least one error present',
        );
        assert.isArray(resValidationResults['errors']);
        for (const k of Object.keys(expectedError)) {
          assert.deepEqual(
            resValidationResults['errors'][0][k],
            expectedError[k],
          );
        }
      },
    });

    testRequestForEachFile({
      testTitle:
        'should return correct validation errors for strictly invalid REQuests',
      dir: schemasDirV3,
      testRequests: STRICTLY_INVALID_TEST_REQUESTS.v3,
      client: clients,
      defaultForbidAdditionalProperties: true,
      callback(proxyRes, _targetRes, fileName, requestObject) {
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const reqValidationResults = validationResults['request'];
        assert.isNotTrue(reqValidationResults['valid']);
        assert.isNotNull(reqValidationResults['errors']);
        assert.isArray(reqValidationResults['errors']);
        assert.lengthOf(reqValidationResults['errors'], 1);

        for (const k of Object.keys(requestObject.expectedError)) {
          assert.deepEqual(
            reqValidationResults['errors'][0][k],
            requestObject.expectedError[k],
          );
        }
      },
    });

    testRequestForEachFileWithServers({
      testTitle:
        'should return correct validation errors for strictly invalid RESponses',
      dir: schemasDirV3,
      testServers: STRICTLY_NON_COMPLIANT_SERVERS.v3,
      client: clients,
      defaultForbidAdditionalProperties: true,
      callback(proxyRes, targetRes, fileName, expectedError) {
        assert.isDefined(
          expectedError,
          '"expectedError" property should be set for test requests that check for validation errors',
        );
        const validationResults = JSON.parse(
          proxyRes.headers['openapi-cop-validation-result'],
        );
        const resValidationResults = validationResults['response'];
        assert.isNotTrue(
          resValidationResults['valid'],
          'Response should be invalid',
        );
        assert.isNotNull(
          resValidationResults['errors'],
          'There should be at least one error present',
        );
        assert.isArray(resValidationResults['errors']);
        for (const k of Object.keys(expectedError)) {
          assert.deepEqual(
            resValidationResults['errors'][0][k],
            expectedError[k],
          );
        }
      },
    });
  });
});
