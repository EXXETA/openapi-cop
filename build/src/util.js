"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_spec_converter_1 = require("api-spec-converter");
const ct = require("content-type");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const qs = require("qs");
const waitOn = require("wait-on");
const errors_1 = require("../types/errors");
function isSwaggerV2(apiDoc) {
    return apiDoc.swagger === '2.0';
}
function isOpenAPIv3(apiDoc) {
    return typeof apiDoc.openapi === 'string' && apiDoc.openapi.startsWith('3.');
}
/**
 * Provides the format of the OpenAPI document.
 * @param apiDoc A parsed OpenAPI document as a plain Object.
 */
function getAPIDocFormat(apiDoc) {
    const validators = {
        'openapi-2.0': isSwaggerV2,
        'openapi-3.0': isOpenAPIv3,
    };
    for (const format in validators) {
        if (!validators.hasOwnProperty(format))
            continue;
        const validator = validators[format];
        if (validator(apiDoc))
            return format;
    }
    return null;
}
exports.getAPIDocFormat = getAPIDocFormat;
function readFileSync(filePath) {
    const cwd = process.cwd();
    process.chdir(path.dirname(filePath));
    const apiDoc = readJsonOrYamlSync(filePath);
    process.chdir(cwd);
    return apiDoc;
}
exports.readFileSync = readFileSync;
function readJsonOrYamlSync(filePath) {
    switch (path.extname(filePath)) {
        case '.json':
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        case '.yaml':
        case '.yml':
            return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
        case '.':
            throw new Error('Will not convert a file that has no extension.');
        default:
            throw new Error('Wrong file extension.');
    }
}
exports.readJsonOrYamlSync = readJsonOrYamlSync;
/**
 * Converts a OpenAPI document to v3. It detects the filetype of the document
 * and returns the contents as an Object. Returns the contents of the
 * unmodified file when no conversion is necessary.
 */
async function convertToOpenApiV3(apiDoc, filePath) {
    switch (getAPIDocFormat(apiDoc)) {
        case 'openapi-2.0':
            const apiDocTarget = await api_spec_converter_1.convert({
                from: 'swagger_2',
                to: 'openapi_3',
                source: filePath,
            });
            return apiDocTarget.spec;
        case 'openapi-3.0':
            // Return unmodified OpenAPI document
            return apiDoc;
        default:
            throw new Error('Unsupported API document format');
    }
}
exports.convertToOpenApiV3 = convertToOpenApiV3;
/** Converts an express.Request to a simplified OpenAPI request. */
function toOasRequest(req) {
    const oasRequest = {
        method: req.method,
        path: req.params[0],
        headers: req.headers,
        query: req.query,
    };
    // Parse when body is present
    if (typeof req.body !== 'undefined' && req.body instanceof Buffer) {
        try {
            oasRequest.body = parseRequest(req);
        }
        catch (e) {
            throw new errors_1.ResponseParsingError('Failed to parse request body. ' + e);
        }
    }
    return oasRequest;
}
exports.toOasRequest = toOasRequest;
/**
 * Parses a request depending on the 'Content-Type' header. Supports JSON and
 * URL-encoded formats. The request body should be a Buffer.
 */
function parseRequest(req) {
    const contentTypeString = req.get('content-type');
    if (!contentTypeString) {
        throw new Error('Received request with an empty Content-Type header.');
    }
    if (!(req.body instanceof Buffer)) {
        throw new Error('Can not parse a request body which is not a Buffer.');
    }
    const contentType = ct.parse(contentTypeString);
    const charset = contentType.parameters['charset'] || 'utf-8';
    if (req.is('application/json') || req.is('json')) {
        return JSON.parse(req.body.toString(charset));
    }
    if (req.is('application/x-www-form-urlencoded')) {
        return qs.parse(req.body.toString(charset));
    }
    throw new Error(`No parser available for content type '${contentType}'.`);
}
exports.parseRequest = parseRequest;
/**
 * Parses a response body depending on the 'Content-Type' header. Supports JSON
 * and URL-encoded formats. The response body should be a string.
 */
function parseResponseBody(res) {
    const contentTypeString = res.headers['content-type'];
    if (!contentTypeString) {
        throw new Error('Received response with an empty Content-Type header.');
    }
    const contentType = ct.parse(contentTypeString);
    if (!(typeof res.body === 'string')) {
        throw new Error('Can not parse a response body which is not a string.');
    }
    if (contentType.type === 'application/json' || contentType.type === 'json') {
        return JSON.parse(res.body);
    }
    if (contentType.type === 'application/x-www-form-urlencoded') {
        return qs.parse(res.body);
    }
    throw new Error(`No parser available for content type '${contentType}'.`);
}
exports.parseResponseBody = parseResponseBody;
/**
 * Copies the headers from a source response into a target response,
 * overwriting existing values.
 */
function copyHeaders(sourceResponse, targetResponse) {
    for (const key in sourceResponse.headers) {
        if (sourceResponse.headers.hasOwnProperty(key)) {
            targetResponse.setHeader(key, sourceResponse.headers[key]);
        }
    }
}
exports.copyHeaders = copyHeaders;
/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
function setValidationHeader(res, validationResults) {
    res.setHeader('openapi-cop-validation-result', JSON.stringify(validationResults));
}
exports.setValidationHeader = setValidationHeader;
/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
function setSourceRequestHeader(res, oasRequest) {
    res.setHeader('openapi-cop-source-request', JSON.stringify(oasRequest));
}
exports.setSourceRequestHeader = setSourceRequestHeader;
/** Closes the server and waits until the port is again free. */
async function closeServer(server) {
    const port = server.address().port;
    await new Promise((resolve, reject) => {
        server.close(err => {
            if (err)
                return reject(err);
            resolve();
        });
    });
    await waitOn({ resources: [`http://localhost:${port}`], reverse: true });
}
exports.closeServer = closeServer;
/**
 * Recursively maps a nested object (JSON) given a mapping function. Maps in
 * depth-first order. If it finds an array it applies the mapping function
 * for object elements.
 *
 * @param obj Object to be mapped on.
 * @param fn Mapping function that returns the new value.
 */
function mapWalkObject(obj, fn) {
    let objCopy = Object.assign({}, obj);
    for (const key in obj) {
        if (!obj.hasOwnProperty(key))
            continue;
        const value = obj[key];
        if (value.constructor === Object) {
            objCopy[key] = mapWalkObject(value, fn);
        }
        else if (value.constructor === Array) {
            objCopy[key] = objCopy[key].map((e) => {
                if (e.constructor === Object) {
                    return mapWalkObject(e, fn);
                }
                else {
                    return e;
                }
            });
        }
    }
    objCopy = fn(objCopy);
    return objCopy;
}
exports.mapWalkObject = mapWalkObject;
//# sourceMappingURL=util.js.map