"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('openapi-cop:proxy');
const swaggerClient = require('swagger-client');
const swaggerParser = require('swagger-parser');
const refParser = require("json-schema-ref-parser");
const openapi_backend_1 = require("openapi-backend");
const errors_1 = require("../types/errors");
/**
 * Checks if the OpenAPI document is a valid definition. Wrapper around
 * SwaggerParser.validate.
 * @param spec The object representation of the OpenAPI document
 */
async function validateDocument(spec) {
    try {
        const api = await swaggerParser.validate(spec);
        debug(`    Validated API definition for "${api.info.title}" [version ${api.info.version}]`);
    }
    catch (err) {
        throw new errors_1.SchemaValidationException(err);
    }
}
exports.validateDocument = validateDocument;
/**
 * Resolves all references, including allOf relationships. Wrapper around
 * SwaggerClient.resolve.
 * @param spec The object representation of the OpenAPI document
 * @param baseDoc The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
async function resolve(spec, baseDoc) {
    const resolutionResult = await swaggerClient.resolve({
        pathDiscriminator: [],
        spec,
        baseDoc,
        allowMetaPatches: true,
        skipNormalization: true,
    });
    if (resolutionResult.errors.length > 0) {
        throw new Error(`Could not resolve references in OpenAPI document due to the following errors:
    ${JSON.stringify(resolutionResult.errors, null, 2)}`);
    }
    const apiDoc = resolutionResult.spec;
    delete apiDoc['$$normalized']; // delete additional property that is added by
    // the resolver
    return apiDoc;
}
exports.resolve = resolve;
/**
 * Collects all file references and yields a single OpenAPI object with only
 * local references.
 * @param spec The object representation of the OpenAPI document
 * @param basePath The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
function dereference(spec, basePath) {
    return refParser.dereference(basePath, spec, {});
}
exports.dereference = dereference;
/**
 * Validator to match requests to operations and validate
 * requests and responses using a OpenAPI document. Wrapper around
 * OpenAPIValidator.
 */
class Validator {
    constructor(apiDoc) {
        this.apiDoc = apiDoc;
        this.oasValidator = new openapi_backend_1.OpenAPIValidator({
            definition: apiDoc,
            ajvOpts: { unknownFormats: ['int32', 'int64', 'float', 'double'] },
        });
    }
    matchOperation(oasRequest) {
        return this.oasValidator.router.matchOperation(oasRequest);
    }
    validateRequest(oasRequest, operation) {
        if (!operation || !operation.operationId) {
            return {
                valid: false,
                errors: [
                    {
                        keyword: 'operation',
                        dataPath: '',
                        schemaPath: '',
                        params: [],
                        message: `Unknown operation '${oasRequest.path}'`,
                    },
                ],
            };
        }
        return this.oasValidator.validateRequest(oasRequest, operation);
    }
    validateResponse(responseBody, operation, statusCode) {
        return this.oasValidator.validateResponse(responseBody, operation, statusCode);
    }
    validateResponseHeaders(headers, operation, statusCode) {
        return this.oasValidator.validateResponseHeaders(headers, operation, {
            statusCode,
            setMatchType: openapi_backend_1.SetMatchType.Superset,
        });
    }
}
exports.Validator = Validator;
function hasErrors(validationResults) {
    const isRequestValid = !validationResults.request || validationResults.request.valid;
    const isResponseValid = !validationResults.response || validationResults.response.valid;
    const areResponseHeadersValid = !validationResults.responseHeaders ||
        validationResults.responseHeaders.valid;
    return !isRequestValid || !isResponseValid || !areResponseHeadersValid;
}
exports.hasErrors = hasErrors;
//# sourceMappingURL=validation.js.map