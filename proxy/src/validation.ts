const debug = require('debug')('openapi-cop:proxy');
const swaggerClient = require('swagger-client');
const swaggerParser = require('swagger-parser');
import { IncomingHttpHeaders } from 'http';
import * as refParser from 'json-schema-ref-parser';
import {
  OpenAPIValidator,
  Request as OasRequest,
  ValidationResult,
  Operation,
  SetMatchType,
} from 'openapi-backend';

import { SchemaValidationException } from '../types/errors';
import { ValidationResults } from '../types/validation';

/**
 * Checks if the OpenAPI document is a valid definition. Wrapper around
 * SwaggerParser.validate.
 * @param spec The object representation of the OpenAPI document
 */
export async function validateDocument(spec: any) {
  try {
    const api = await swaggerParser.validate(spec);
    debug(
      `    Validated API definition for "${api.info.title}" [version ${api.info.version}]`
    );
  } catch (err) {
    throw new SchemaValidationException(err);
  }
}

/**
 * Resolves all references, including allOf relationships. Wrapper around
 * SwaggerClient.resolve.
 * @param spec The object representation of the OpenAPI document
 * @param baseDoc The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
export async function resolve(spec: any, baseDoc: string) {
  const resolutionResult = await swaggerClient.resolve({
    pathDiscriminator: [],
    spec,
    baseDoc,
    allowMetaPatches: true,
    skipNormalization: true,
  });

  if (resolutionResult.errors.length > 0) {
    throw new Error(
      `Could not resolve references in OpenAPI document due to the following errors:
    ${JSON.stringify(resolutionResult.errors, null, 2)}`
    );
  }

  const apiDoc = resolutionResult.spec;
  delete apiDoc['$$normalized']; // delete additional property that is added by
  // the resolver
  return apiDoc;
}

/**
 * Collects all file references and yields a single OpenAPI object with only
 * local references.
 * @param spec The object representation of the OpenAPI document
 * @param basePath The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
export function dereference(
  spec: any,
  basePath: string
): Promise<refParser.JSONSchema> {
  return refParser.dereference(basePath, spec, {});
}

/**
 * Validator to match requests to operations and validate
 * requests and responses using a OpenAPI document. Wrapper around
 * OpenAPIValidator.
 */
export class Validator {
  apiDoc: any;
  oasValidator: OpenAPIValidator;

  constructor(apiDoc: any) {
    this.apiDoc = apiDoc;

    this.oasValidator = new OpenAPIValidator({
      definition: apiDoc,
      ajvOpts: { unknownFormats: ['int32', 'int64', 'float', 'double'] },
    });
  }

  matchOperation(oasRequest: OasRequest) {
    return this.oasValidator.router.matchOperation(oasRequest);
  }

  validateRequest(
    oasRequest: OasRequest,
    operation: Operation | undefined
  ): ValidationResult {
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

  validateResponse(
    responseBody: string,
    operation: Operation,
    statusCode: number
  ) {
    return this.oasValidator.validateResponse(
      responseBody,
      operation,
      statusCode
    );
  }

  validateResponseHeaders(
    headers: IncomingHttpHeaders,
    operation: Operation,
    statusCode: number
  ) {
    return this.oasValidator.validateResponseHeaders(headers, operation, {
      statusCode,
      setMatchType: SetMatchType.Superset,
    });
  }
}

export function hasErrors(validationResults: ValidationResults) {
  const isRequestValid =
    !validationResults.request || validationResults.request.valid;
  const isResponseValid =
    !validationResults.response || validationResults.response.valid;
  const areResponseHeadersValid =
    !validationResults.responseHeaders ||
    validationResults.responseHeaders.valid;
  return !isRequestValid || !isResponseValid || !areResponseHeadersValid;
}
