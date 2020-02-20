"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const util_1 = require("../src/util");
const validation_1 = require("../src/validation");
const config_1 = require("./config");
const io_1 = require("./util/io");
const testing_1 = require("./util/testing");
// tslint:disable: only-arrow-functions
describe('Loading and validation of OpenAPI schemas', function () {
    {
        const schemaDir = path.join(config_1.SCHEMAS_DIR, 'v3');
        process.chdir(schemaDir);
        for (const filePath of io_1.readDirFilesSync(schemaDir)) {
            const fileName = path
                .normalize(path.basename(filePath))
                .replace(/\\/g, '/');
            it(`should be able to load valid openapi v3 schemas: ${fileName}`, async function () {
                const apiDoc = util_1.readJsonOrYamlSync(filePath);
                await validation_1.validateDocument(apiDoc);
            });
        }
    }
    {
        const schemaDir = path.join(config_1.SCHEMAS_DIR, 'v2');
        process.chdir(schemaDir);
        for (const filePath of io_1.readDirFilesSync(schemaDir)) {
            const fileName = path
                .normalize(path.basename(filePath))
                .replace(/\\/g, '/');
            it(`should be able to load valid openapi v2 schemas: ${fileName}`, async function () {
                const apiDoc = util_1.readJsonOrYamlSync(filePath);
                await validation_1.validateDocument(apiDoc);
            });
        }
    }
    {
        const schemaDir = path.join(config_1.SCHEMAS_DIR, 'invalid');
        process.chdir(schemaDir);
        for (const filePath of io_1.readDirFilesSync(schemaDir)) {
            const fileName = path
                .normalize(path.basename(filePath))
                .replace(/\\/g, '/');
            it(`should fail to load invalid openapi schemas: ${fileName}`, async function () {
                const apiDoc = util_1.readJsonOrYamlSync(filePath);
                await testing_1.assertThrowsAsync(async () => validation_1.validateDocument(apiDoc), /SchemaValidationException|SyntaxError/);
            });
        }
    }
});
//# sourceMappingURL=01.unit.test.js.map