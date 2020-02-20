/// <reference types="node" />
import { IncomingHttpHeaders } from 'http';
import * as refParser from 'json-schema-ref-parser';
import { OpenAPIValidator, Request as OasRequest, ValidationResult, Operation } from 'openapi-backend';
import { ValidationResults } from '../types/validation';
/**
 * Checks if the OpenAPI document is a valid definition. Wrapper around
 * SwaggerParser.validate.
 * @param spec The object representation of the OpenAPI document
 */
export declare function validateDocument(spec: any): Promise<void>;
/**
 * Resolves all references, including allOf relationships. Wrapper around
 * SwaggerClient.resolve.
 * @param spec The object representation of the OpenAPI document
 * @param baseDoc The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
export declare function resolve(spec: any, baseDoc: string): Promise<any>;
/**
 * Collects all file references and yields a single OpenAPI object with only
 * local references.
 * @param spec The object representation of the OpenAPI document
 * @param basePath The path to the API base document (i.e. the 'swagger.json'
 * file)
 */
export declare function dereference(spec: any, basePath: string): Promise<refParser.JSONSchema>;
/**
 * Validator to match requests to operations and validate
 * requests and responses using a OpenAPI document. Wrapper around
 * OpenAPIValidator.
 */
export declare class Validator {
    apiDoc: any;
    oasValidator: OpenAPIValidator;
    constructor(apiDoc: any);
    matchOperation(oasRequest: OasRequest): Operation | undefined;
    validateRequest(oasRequest: OasRequest, operation: Operation | undefined): ValidationResult;
    validateResponse(responseBody: string, operation: Operation, statusCode: number): ValidationResult;
    validateResponseHeaders(headers: IncomingHttpHeaders, operation: Operation, statusCode: number): ValidationResult;
}
export declare function hasErrors(validationResults: ValidationResults): boolean;
