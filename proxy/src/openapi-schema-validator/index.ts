/**
 * Copyright (c) 2018 Kogo Softare LLC
 *
 * https://github.com/kogosoftwarellc/open-api
 */

import * as Ajv from 'ajv';
import * as openapi2Schema from './schemas/v2.0.json';
import * as openapi3Schema from './schemas/v3.0.json';
import { merge } from 'lodash';
import { IJsonSchema, OpenAPI } from 'openapi-types';

// tslint:disable-next-line:interface-name
export interface IOpenAPISchemaValidator {
  /**
   * Validate the provided OpenAPI doc against this validator's schema version
   * and return the results.
   */
  validate(doc: OpenAPI.Document): OpenAPISchemaValidatorResult;
}

export interface OpenAPISchemaValidatorArgs {
  version: string;
  extensions?: IJsonSchema;
}

export interface OpenAPISchemaValidatorResult {
  errors: Ajv.ErrorObject[];
}

// tslint:disable-next-line:no-default-export
export default class OpenAPISchemaValidator implements IOpenAPISchemaValidator {
  private validator: Ajv.ValidateFunction;
  constructor(args: OpenAPISchemaValidatorArgs) {
    const v = new Ajv({ schemaId: 'auto', allErrors: true });
    v.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    const schema = merge(
      {},
      args.version === 'openapi-2.0' ? openapi2Schema : openapi3Schema,
      args ? args.extensions : {}
    );
    v.addSchema(schema);
    this.validator = v.compile(schema);
  }

  validate(openapiDoc: OpenAPI.Document): OpenAPISchemaValidatorResult {
    if (!this.validator(openapiDoc)) {
      return { errors: this.validator.errors || [] };
    } else {
      return { errors: [] };
    }
  }
}
