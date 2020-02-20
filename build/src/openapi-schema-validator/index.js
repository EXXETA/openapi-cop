"use strict";
/**
 * Copyright (c) 2018 Kogo Softare LLC
 *
 * https://github.com/kogosoftwarellc/open-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Ajv = require("ajv");
const openapi2Schema = require("./schemas/v2.0.json");
const openapi3Schema = require("./schemas/v3.0.json");
const lodash_1 = require("lodash");
// tslint:disable-next-line:no-default-export
class OpenAPISchemaValidator {
    constructor(args) {
        const v = new Ajv({ schemaId: 'auto', allErrors: true });
        v.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        const schema = lodash_1.merge({}, args.version === 'openapi-2.0' ? openapi2Schema : openapi3Schema, args ? args.extensions : {});
        v.addSchema(schema);
        this.validator = v.compile(schema);
    }
    validate(openapiDoc) {
        if (!this.validator(openapiDoc)) {
            return { errors: this.validator.errors || [] };
        }
        else {
            return { errors: [] };
        }
    }
}
exports.default = OpenAPISchemaValidator;
//# sourceMappingURL=index.js.map