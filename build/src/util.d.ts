/// <reference types="node" />
import * as express from 'express';
import { Response } from 'express';
import * as http from 'http';
import { Request as OasRequest } from 'openapi-backend';
import { ValidationResults } from '../types/validation';
/**
 * Provides the format of the OpenAPI document.
 * @param apiDoc A parsed OpenAPI document as a plain Object.
 */
export declare function getAPIDocFormat(apiDoc: any): ('openapi-2.0' | 'openapi-3.0') | null;
export declare function readFileSync(filePath: string): any;
export declare function readJsonOrYamlSync(filePath: string): any;
/**
 * Converts a OpenAPI document to v3. It detects the filetype of the document
 * and returns the contents as an Object. Returns the contents of the
 * unmodified file when no conversion is necessary.
 */
export declare function convertToOpenApiV3(apiDoc: any, filePath: string): Promise<any>;
/** Converts an express.Request to a simplified OpenAPI request. */
export declare function toOasRequest(req: express.Request): OasRequest;
/**
 * Parses a request depending on the 'Content-Type' header. Supports JSON and
 * URL-encoded formats. The request body should be a Buffer.
 */
export declare function parseRequest(req: express.Request): any;
/**
 * Parses a response body depending on the 'Content-Type' header. Supports JSON
 * and URL-encoded formats. The response body should be a string.
 */
export declare function parseResponseBody(res: http.IncomingMessage & {
    body: string;
}): any;
/**
 * Copies the headers from a source response into a target response,
 * overwriting existing values.
 */
export declare function copyHeaders(sourceResponse: any, targetResponse: Response): void;
/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
export declare function setValidationHeader(res: Response, validationResults: ValidationResults): void;
/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
export declare function setSourceRequestHeader(res: Response, oasRequest: OasRequest): void;
/** Closes the server and waits until the port is again free. */
export declare function closeServer(server: http.Server): Promise<void>;
/**
 * Recursively maps a nested object (JSON) given a mapping function. Maps in
 * depth-first order. If it finds an array it applies the mapping function
 * for object elements.
 *
 * @param obj Object to be mapped on.
 * @param fn Mapping function that returns the new value.
 */
export declare function mapWalkObject(obj: any, fn: (currentObj: any) => any): any;
