import { convert as convertApiFormat } from 'api-spec-converter';
import * as ct from 'content-type';
import * as express from 'express';
import { Response } from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as yaml from 'js-yaml';
import { Request as OasRequest } from 'openapi-backend';
import * as path from 'path';
import * as qs from 'qs';
import * as waitOn from 'wait-on';
import { ResponseParsingError } from '../types/errors';
import { ValidationResults } from '../types/validation';
import * as rp from 'request-promise-native';

function isSwaggerV2(apiDoc: any): boolean {
  return apiDoc.swagger === '2.0';
}

function isOpenAPIv3(apiDoc: any): boolean {
  return typeof apiDoc.openapi === 'string' && apiDoc.openapi.startsWith('3.');
}

/**
 * Provides the format of the OpenAPI document.
 * @param apiDoc A parsed OpenAPI document as a plain Object.
 */
export function getAPIDocFormat(
  apiDoc: any,
): ('openapi-2.0' | 'openapi-3.0') | null {
  const validators: { [key: string]: (apiDoc: any) => boolean } = {
    'openapi-2.0': isSwaggerV2,
    'openapi-3.0': isOpenAPIv3,
  };

  for (const format in validators) {
    const validator = validators[format];
    if (validator(apiDoc)) return format as 'openapi-2.0' | 'openapi-3.0';
  }

  return null;
}

export function parseJsonOrYaml(filePath: string, data: string): any {
  switch (path.extname(filePath)) {
    case '.json':
      return JSON.parse(data);
    case '.yaml':
    case '.yml':
      return yaml.safeLoad(data);
    case '.':
      throw new Error('Will not read a file that has no extension.');
    default:
      throw new Error('Wrong file extension.');
  }
}

export function readJsonOrYamlSync(filePath: string): any {
  return parseJsonOrYaml(filePath, fs.readFileSync(filePath, 'utf8'));
}

export function readFileSync(filePath: string): any {
  const cwd = process.cwd();
  process.chdir(path.dirname(filePath));
  const apiDoc = readJsonOrYamlSync(filePath);
  process.chdir(cwd);
  return apiDoc;
}

export async function fetchAndReadFile(uri: string): Promise<any> {
  return rp(uri).then(responseBody => parseJsonOrYaml(uri, responseBody));
}

/**
 * Converts a OpenAPI document to v3. It detects the filetype of the document
 * and returns the contents as an Object. Returns the contents of the
 * unmodified file when no conversion is necessary.
 */
export async function convertToOpenApiV3(
  apiDoc: any,
  filePath: string,
): Promise<any> {
  switch (getAPIDocFormat(apiDoc)) {
    case 'openapi-2.0': {
      const apiDocTarget = await convertApiFormat({
        from: 'swagger_2',
        to: 'openapi_3',
        source: filePath,
      });
      return apiDocTarget.spec;
    }
    case 'openapi-3.0':
      // Return unmodified OpenAPI document
      return apiDoc;
    default:
      throw new Error('Unsupported API document format');
  }
}

/**
 * Parses a request depending on the 'Content-Type' header. Supports JSON and
 * URL-encoded formats. The request body should be a Buffer.
 */
export function parseRequest(req: express.Request): any {
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

/** Converts an express.Request to a simplified OpenAPI request. */
export function toOasRequest(req: express.Request): OasRequest {
  const oasRequest: OasRequest = {
    method: req.method,
    path: req.params[0],
    headers: req.headers as {
      [key: string]: string | string[];
    },
    query: req.query,
  };

  // Parse when body is present
  if (typeof req.body !== 'undefined' && req.body instanceof Buffer) {
    try {
      oasRequest.body = parseRequest(req);
    } catch (e) {
      throw new ResponseParsingError('Failed to parse request body. ' + e);
    }
  }

  return oasRequest;
}

/**
 * Parses a response body depending on the 'Content-Type' header. Supports JSON
 * and URL-encoded formats. The response body should be a string.
 */
export function parseResponseBody(
  res: http.IncomingMessage & {
    body: string;
  },
): any {
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

/**
 * Copies the headers from a source response into a target response,
 * overwriting existing values.
 */
export function copyHeaders(
  sourceResponse: any,
  targetResponse: Response,
): void {
  for (const key in sourceResponse.headers) {
    targetResponse.setHeader(key, sourceResponse.headers[key]);
  }
}

/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
export function setValidationHeader(
  res: Response,
  validationResults: ValidationResults,
): void {
  res.setHeader(
    'openapi-cop-validation-result',
    JSON.stringify(validationResults),
  );
}

/**
 * Sets a custom openapi-cop validation header ('openapi-cop-validation-result')
 * to the validation results as JSON.
 */
export function setSourceRequestHeader(
  res: Response,
  oasRequest: OasRequest,
): void {
  res.setHeader('openapi-cop-source-request', JSON.stringify(oasRequest));
}

/** Closes the server and waits until the port is again free. */
export async function closeServer(server: http.Server): Promise<void> {
  const port = (server.address() as any).port;
  await new Promise((resolve, reject) => {
    server.close(err => {
      if (err) return reject(err);
      resolve();
    });
  });

  await waitOn({ resources: [`http://localhost:${port}`], reverse: true });
}

/**
 * Recursively maps a nested object (JSON) given a mapping function. Maps in
 * depth-first order. If it finds an array it applies the mapping function
 * for object elements.
 *
 * @param obj Object to be mapped on.
 * @param fn Mapping function that returns the new value.
 */
export function mapWalkObject(obj: any, fn: (currentObj: any) => any): any {
  let objCopy = Object.assign({}, obj);
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (value.constructor === Object) {
      objCopy[key] = mapWalkObject(value, fn);
    } else if (value.constructor === Array) {
      objCopy[key] = objCopy[key].map((e: any) => {
        if (e.constructor === Object) {
          return mapWalkObject(e, fn);
        } else {
          return e;
        }
      });
    }
  }
  objCopy = fn(objCopy);
  return objCopy;
}
