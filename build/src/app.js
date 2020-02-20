"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('openapi-cop:proxy');
debug.log = console.log.bind(console); // output to stdout
const chalk_1 = require("chalk");
const express = require("express");
const path = require("path");
const rp = require("request-promise-native");
const util_1 = require("./util");
const validation_1 = require("./validation");
const defaults = {
    targetUrl: 'http://localhost:8889',
    apiDocFile: '',
    defaultForbidAdditionalProperties: false,
    silent: false,
};
/**
 * Builds a new express app instance, and attaches all necessary middleware.
 */
async function buildApp(options) {
    const { targetUrl, apiDocFile, defaultForbidAdditionalProperties, silent } = Object.assign(Object.assign({}, defaults), options);
    const app = express();
    const apiDocRaw = util_1.readFileSync(apiDocFile);
    console.log(chalk_1.default.blue('Validating against ' +
        chalk_1.default.bold(`${path.basename(apiDocFile)} ("${apiDocRaw.info.title}", version: ${apiDocRaw.info.version})`)));
    if (defaultForbidAdditionalProperties) {
        console.log(chalk_1.default.keyword('orange')('Additional properties will be forbidden by default. Existing `additionalProperties` settings in the OpenAPI document will NOT be overwritten.'));
    }
    const apiDocConv = await util_1.convertToOpenApiV3(apiDocRaw, apiDocFile).catch(err => {
        throw new Error(`Could not convert document to OpenAPI v3: ${err}`);
    });
    const apiDocDeref = await validation_1.dereference(apiDocConv, apiDocFile).catch(err => {
        throw new Error(`Reference resolution error: ${err}`);
    });
    let apiDoc = await validation_1.resolve(apiDocDeref, apiDocFile).catch(err => {
        throw new Error(`Reference resolution error: ${err}`);
    });
    // In strict mode, modify the API definition, unless the
    // additionalProperties is set.
    if (defaultForbidAdditionalProperties) {
        apiDoc = util_1.mapWalkObject(apiDoc, obj => {
            // Set additionalProperties to false if not set already
            if ('properties' in obj && !('additionalProperties' in obj)) {
                obj.additionalProperties = false;
            }
            return obj;
        });
    }
    const oasValidator = new validation_1.Validator(apiDoc);
    // Consume raw request body
    app.use(express.raw({ type: '*/*' }));
    // Global route handler
    app.all('*', (req, res) => {
        const validationResults = {};
        // Build simplified request (for OpenAPIBackend validator)
        const oasRequest = util_1.toOasRequest(req);
        // Write source request into response header
        util_1.setSourceRequestHeader(res, oasRequest);
        // Deduce OpenAPI operation
        const operation = oasValidator.matchOperation(oasRequest);
        validationResults.request = oasValidator.validateRequest(oasRequest, operation);
        const options = {
            url: targetUrl.replace(/\/$/, '') + req.params[0],
            qs: req.query,
            method: req.method,
            headers: req.headers,
            gzip: true,
            resolveWithFullResponse: true,
            simple: false,
        };
        // Attach unmodified request body when present
        if (typeof req.body !== 'undefined' && req.body instanceof Buffer) {
            options.body = req.body;
        }
        debug(`Proxying client request [${oasRequest.method} ${oasRequest.path}]`);
        // Send request and handle response of the target server
        rp(options)
            .then((serverResponse) => {
            debug(`Received server response with status code ${serverResponse.statusCode}`);
            const statusCode = serverResponse.statusCode || 500;
            const parsedResponseBody = util_1.parseResponseBody(serverResponse);
            validationResults.response = oasValidator.validateResponse(parsedResponseBody, operation, statusCode);
            validationResults.responseHeaders = oasValidator.validateResponseHeaders(serverResponse.headers, operation, statusCode);
            util_1.copyHeaders(serverResponse, res);
            util_1.setValidationHeader(res, validationResults);
            debug(`Validation results [${oasRequest.method} ${oasRequest.path}] ` +
                JSON.stringify(validationResults, null, 2));
            if (silent || !validation_1.hasErrors(validationResults)) {
                // when in silent mode, or when validation succeeded, forward the
                // unmodified server response
                res.status(statusCode).send(serverResponse.body);
            }
            else {
                // when not silent, render validation results on error
                res.status(500).json({
                    error: {
                        message: 'openapi-cop Proxy validation failed',
                        request: oasRequest,
                        response: serverResponse,
                        validationResults,
                    },
                });
            }
        })
            .catch((err) => {
            if (err.error && err.error.errno === 'ECONNREFUSED') {
                debug('Target server is unreachable');
            }
            if (err.response) {
                util_1.copyHeaders(err.response, res);
            }
            util_1.setValidationHeader(res, validationResults);
            debug(`Validation results [${oasRequest.method} ${oasRequest.path}] ` +
                JSON.stringify(validationResults, null, 2));
            if (silent || !validation_1.hasErrors(validationResults)) {
                res.status(err.statusCode || 500).send(err.response);
            }
            else {
                // when not silent, render validation results on error
                res.status(500).json({
                    error: {
                        message: 'openapi-cop Proxy validation failed',
                        request: oasRequest,
                        response: err.response,
                        validationResults,
                    },
                });
            }
        });
    });
    // Global error handler
    app.use((err, _req, res, _next) => {
        console.error('openapi-cop found an error (but is still alive).');
        console.error(err.stack);
        res.header('Content-Type', 'application/json');
        res.status(500).send('openapi-cop proxy server error');
    });
    return app;
}
exports.buildApp = buildApp;
/**
 * Builds the proxy and runs it on the given port.
 * @param proxy The port on which the proxy will run.
 * @param host The host name or IP address of the proxy server.
 * @param targetUrl The URL the proxy routes from.
 * @param apiDocFile The OpenAPI document path used to perform validation.
 * @param defaultForbidAdditionalProperties Whether additional properties are
 * allowed in requests and responses.
 * @param silent Do not respond with 500 status when validation fails, but leave
 * the server response untouched
 */
async function runProxy({ port, host, targetUrl, apiDocFile, defaultForbidAdditionalProperties = false, silent = false, }) {
    try {
        const app = await buildApp({
            targetUrl,
            apiDocFile,
            defaultForbidAdditionalProperties,
            silent,
        });
        let server;
        return new Promise(r => {
            server = app.listen(port, host, () => {
                r();
            });
        }).then(() => {
            return server;
        });
    }
    catch (e) {
        console.error('Failed to run openapi-cop', e.message);
        return Promise.reject();
    }
}
exports.runProxy = runProxy;
//# sourceMappingURL=app.js.map