"use strict";
// tslint:disable: only-arrow-functions
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * NOTE: When debugging test cases, make use of the script "dev-mock"
 * to spawn a proxy server along with a mock server using a specified
 * OpenAPI file, e.g.
 *
 *    npm run dev-mock -- "./schemas/v3/3-parameters.yaml"
 *
 * Afterwards, you can use curl to reproduce the requests.
 */
const chai_1 = require("chai");
const path = require("path");
const test_requests_1 = require("./test_data/test-requests");
const test_target_servers_1 = require("./test_data/test-target-servers");
const process_1 = require("./util/process");
const testing_1 = require("./util/testing");
const findProcess = require("find-process");
const config_1 = require("./config");
const axios_1 = require("axios");
const app_1 = require("../src/app");
const util_1 = require("../src/util");
describe('integration.test.js', function () {
    this.slow(1000 * 15); // 15 seconds
    const contentType = 'application/json';
    const clients = {
        proxy: axios_1.default.create({
            baseURL: `http://localhost:${config_1.PROXY_PORT}`,
            headers: { 'content-type': contentType },
            validateStatus: () => true,
        }),
        target: axios_1.default.create({
            baseURL: `http://localhost:${config_1.TARGET_SERVER_PORT}`,
            headers: { 'content-type': contentType },
            validateStatus: () => true,
        }),
    };
    before(async function () {
        // Kill active processes listening on any of the given ports
        const pid1 = await findProcess('port', config_1.PROXY_PORT);
        const pid2 = await findProcess('port', config_1.TARGET_SERVER_PORT);
        await process_1.killProcesses([
            ...pid1.filter(p => p.cmd.indexOf('node') !== -1).map(p => p.pid),
            ...pid2.filter(p => p.cmd.indexOf('node') !== -1).map(p => p.pid),
        ]);
    });
    describe('OpenAPI v3', function () {
        const schemasDirV3 = path.join(config_1.SCHEMAS_DIR, 'v3');
        describe('Invariance tests', function () {
            testing_1.testRequestForEachFile({
                testTitle: 'should return the same status and response bodies as the target server in silent mode',
                dir: schemasDirV3,
                testRequests: test_requests_1.VALID_TEST_REQUESTS.v3,
                client: clients,
                silent: true,
                callback(proxyRes, targetRes) {
                    chai_1.assert.deepStrictEqual(proxyRes.data, targetRes.data);
                    chai_1.assert.equal(proxyRes.status, targetRes.status);
                },
            });
            testing_1.testRequestForEachFile({
                testTitle: 'should return the same headers as the target server except from the openapi-cop headers in silent mode',
                dir: schemasDirV3,
                testRequests: test_requests_1.VALID_TEST_REQUESTS.v3,
                client: clients,
                silent: true,
                callback(proxyRes, targetRes) {
                    chai_1.assert.property(proxyRes.headers, 'openapi-cop-validation-result');
                    chai_1.assert.property(proxyRes.headers, 'openapi-cop-source-request');
                    delete proxyRes.headers['openapi-cop-validation-result'];
                    delete proxyRes.headers['openapi-cop-source-request'];
                    // ignore date header
                    delete proxyRes.headers['date'];
                    delete targetRes.headers['date'];
                    chai_1.assert.deepStrictEqual(proxyRes.headers, targetRes.headers, 'Actual is proxy, expected is target');
                },
            });
        });
        it('should return the source request object inside the response header', async function () {
            console.log('Starting proxy server...');
            const server = await app_1.runProxy({
                port: config_1.PROXY_PORT,
                host: 'localhost',
                targetUrl: `http://localhost:${config_1.TARGET_SERVER_PORT}`,
                apiDocFile: config_1.DEFAULT_OPENAPI_FILE,
                defaultForbidAdditionalProperties: false,
            });
            const originalRequest = {
                method: 'GET',
                url: '/pets',
                data: JSON.stringify({ search: 'something' }),
            };
            const proxyResponse = await clients.proxy.request(originalRequest);
            const openapiCopRequest = JSON.parse(proxyResponse.headers['openapi-cop-source-request']);
            chai_1.assert.deepStrictEqual(openapiCopRequest, {
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
            await util_1.closeServer(server);
        });
        testing_1.testRequestForEachFile({
            testTitle: 'should respond with validation headers that are ValidationResult',
            dir: schemasDirV3,
            testRequests: test_requests_1.VALID_TEST_REQUESTS.v3,
            client: clients,
            callback(proxyRes, _targetRes) {
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const validationResultsKeys = [
                    'request',
                    'response',
                    'responseHeaders',
                ];
                chai_1.assert.hasAllKeys(validationResults, validationResultsKeys);
                for (const k of validationResultsKeys) {
                    chai_1.assert.isObject(validationResults[k], `validation results should contain key '${k}'`);
                    chai_1.assert.hasAllKeys(validationResults[k], ['valid', 'errors']);
                    chai_1.assert.isBoolean(validationResults[k]['valid']);
                    chai_1.assert(validationResults[k]['errors'] === null ||
                        Array.isArray(validationResults[k]['errors']), 'validation error should be null or an array');
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
                        validationResults[k]['errors'].forEach((err) => {
                            chai_1.assert(Object.keys(err).every(k => validKeys.includes(k)), // all keys are valid keys
                            'validation error elements should conform with Ajv.ValidationError');
                        });
                    }
                }
            },
        });
        it('should fail when target server is not available', async function () {
            this.timeout(10000);
            console.log('Starting proxy server...');
            const ps = await testing_1.spawnProxyServer(config_1.PROXY_PORT, config_1.TARGET_SERVER_PORT, config_1.DEFAULT_OPENAPI_FILE);
            console.log('Reading output');
            let output = '';
            ps.stdout.on('data', (data) => {
                output += data;
                if (data.toString().includes('Proxying client request')) {
                    setTimeout(() => {
                        ps.kill();
                    }, 1500);
                }
            });
            clients.proxy.request({ method: 'GET', url: '/pets' });
            return new Promise((resolve, reject) => {
                ps.on('exit', (code, signal) => {
                    chai_1.assert.notEqual(code, -1);
                    chai_1.assert.isTrue(output.includes('Validation results'), 'should yield validation results');
                    chai_1.assert.isTrue(output.includes('Target server is unreachable'), 'should show failure to communicate with the target server');
                    resolve();
                });
            });
        });
        testing_1.testRequestForEachFile({
            testTitle: 'should NOT return any validation errors for valid REQuests',
            dir: schemasDirV3,
            testRequests: test_requests_1.VALID_TEST_REQUESTS.v3,
            client: clients,
            callback(proxyRes, _targetRes, fileName, requestObject) {
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const reqValidationResults = validationResults['request'];
                chai_1.assert.isTrue(reqValidationResults['valid']);
                chai_1.assert.isNull(reqValidationResults['errors']);
            },
        });
        testing_1.testRequestForEachFile({
            testTitle: 'should NOT return any validation errors for strictly valid REQuests',
            dir: schemasDirV3,
            testRequests: test_requests_1.STRICTLY_VALID_TEST_REQUESTS.v3,
            client: clients,
            callback(proxyRes, _targetRes, fileName, requestObject) {
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const reqValidationResults = validationResults['request'];
                chai_1.assert.isTrue(reqValidationResults['valid']);
                chai_1.assert.isNull(reqValidationResults['errors']);
            },
        });
        testing_1.testRequestForEachFile({
            testTitle: 'should return correct validation errors for invalid REQuests',
            dir: schemasDirV3,
            testRequests: test_requests_1.INVALID_TEST_REQUESTS.v3,
            client: clients,
            callback(proxyRes, _targetRes, fileName, requestObject) {
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const reqValidationResults = validationResults['request'];
                chai_1.assert.isNotTrue(reqValidationResults['valid']);
                chai_1.assert.isNotNull(reqValidationResults['errors']);
                chai_1.assert.isArray(reqValidationResults['errors']);
                chai_1.assert.lengthOf(reqValidationResults['errors'], 1);
                chai_1.assert.isDefined(requestObject.expectedError, '"expectedError" property should be set for test requests that check for validation errors');
                for (const k of Object.keys(requestObject.expectedError)) {
                    chai_1.assert.deepEqual(reqValidationResults['errors'][0][k], requestObject.expectedError[k]);
                }
            },
        });
        testing_1.testRequestForEachFileWithServers({
            testTitle: 'should return correct validation errors for invalid RESponses',
            dir: schemasDirV3,
            testServers: test_target_servers_1.NON_COMPLIANT_SERVERS.v3,
            client: clients,
            callback(proxyRes, targetRes, fileName, expectedError) {
                chai_1.assert.isDefined(expectedError, '"expectedError" property should be set for test requests that check for validation errors');
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const resValidationResults = validationResults['response'];
                chai_1.assert.isNotTrue(resValidationResults['valid'], 'Response should be invalid');
                chai_1.assert.isNotNull(resValidationResults['errors'], 'There should be at least one error present');
                chai_1.assert.isArray(resValidationResults['errors']);
                for (const k of Object.keys(expectedError)) {
                    chai_1.assert.deepEqual(resValidationResults['errors'][0][k], expectedError[k]);
                }
            },
        });
        testing_1.testRequestForEachFile({
            testTitle: 'should return correct validation errors for strictly invalid REQuests',
            dir: schemasDirV3,
            testRequests: test_requests_1.STRICTLY_INVALID_TEST_REQUESTS.v3,
            client: clients,
            defaultForbidAdditionalProperties: true,
            callback(proxyRes, _targetRes, fileName, requestObject) {
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const reqValidationResults = validationResults['request'];
                chai_1.assert.isNotTrue(reqValidationResults['valid']);
                chai_1.assert.isNotNull(reqValidationResults['errors']);
                chai_1.assert.isArray(reqValidationResults['errors']);
                chai_1.assert.lengthOf(reqValidationResults['errors'], 1);
                for (const k of Object.keys(requestObject.expectedError)) {
                    chai_1.assert.deepEqual(reqValidationResults['errors'][0][k], requestObject.expectedError[k]);
                }
            },
        });
        testing_1.testRequestForEachFileWithServers({
            testTitle: 'should return correct validation errors for strictly invalid RESponses',
            dir: schemasDirV3,
            testServers: test_target_servers_1.STRICTLY_NON_COMPLIANT_SERVERS.v3,
            client: clients,
            defaultForbidAdditionalProperties: true,
            callback(proxyRes, targetRes, fileName, expectedError) {
                chai_1.assert.isDefined(expectedError, '"expectedError" property should be set for test requests that check for validation errors');
                const validationResults = JSON.parse(proxyRes.headers['openapi-cop-validation-result']);
                const resValidationResults = validationResults['response'];
                chai_1.assert.isNotTrue(resValidationResults['valid'], 'Response should be invalid');
                chai_1.assert.isNotNull(resValidationResults['errors'], 'There should be at least one error present');
                chai_1.assert.isArray(resValidationResults['errors']);
                for (const k of Object.keys(expectedError)) {
                    chai_1.assert.deepEqual(resValidationResults['errors'][0][k], expectedError[k]);
                }
            },
        });
    });
});
//# sourceMappingURL=02.integration.test.js.map