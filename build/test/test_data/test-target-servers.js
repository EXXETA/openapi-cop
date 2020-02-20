"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const config_1 = require("../config");
function responderTo(method, path, routeHandler) {
    return async () => {
        const app = express();
        app[method](path, routeHandler);
        return app.listen(config_1.TARGET_SERVER_PORT);
    };
}
/**
 * For every OpenAPI file path, a HTTP server is provided along with valid
 * requests that should nevertheless send a non-compliant response.
 *
 * If a OpenAPI file name is present, but the server array is empty, this is
 * seen as intentional and no tests are run for this OpenAPI document.
 */
exports.NON_COMPLIANT_SERVERS = {
    v3: {
        '2-path.yaml': [
            {
                request: {
                    method: 'POST',
                    url: '/echo',
                    data: JSON.stringify({ input: 'ECHO!' }),
                },
                runServer: responderTo('post', '/echo', (_req, res) => {
                    res.status(200).json({ itseMe: 'Mario!' });
                }),
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
                runServer: responderTo('post', '/echo', (_req, res) => {
                    res.status(400).json({ error: { name: 666, message: 42 } });
                }),
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
                runServer: responderTo('post', '/echo', (_req, res) => {
                    res.status(400).json({ error: { name: 666, message: 42 } });
                }),
                expectedError: { keyword: 'type' },
            },
        ],
        '6-examples.yaml': [
            {
                request: { method: 'GET', url: '/pets' },
                runServer: responderTo('get', '/pets', (_req, res) => {
                    res.status(200).json([{ id: 12, name: 'Figaro' }, 'rofl', 'lol']);
                }),
                expectedError: { keyword: 'type', message: 'should be object' },
            },
        ],
        '7-petstore.yaml': [
        // Nothing to test
        ],
    },
};
exports.STRICTLY_NON_COMPLIANT_SERVERS = {
    v3: {
        '2-path.yaml': [
            {
                request: {
                    method: 'POST',
                    url: '/echo',
                    data: JSON.stringify({ input: 'ECHO!' }),
                },
                runServer: responderTo('post', '/echo', (_req, res) => {
                    res
                        .status(200)
                        .json({ output: 'The cake is a lie', forrest: 'Gump' });
                }),
                expectedError: { keyword: 'additionalProperties' },
            },
        ],
    },
};
//# sourceMappingURL=test-target-servers.js.map