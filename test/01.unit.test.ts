import * as path from 'path';

import { readJsonOrYamlSync } from '../src/util';
import { validateDocument } from '../src/validation';

import { SCHEMAS_DIR } from './config';
import { getFileName, readDirFilesSync } from './util/io';
import { assertThrowsAsync } from './util/testing';

// tslint:disable: only-arrow-functions
describe('Loading and validation of OpenAPI schemas', function() {
  {
    const schemaDir = path.join(SCHEMAS_DIR, 'v3');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      it(`should be able to load valid openapi v3 schemas: ${getFileName(filePath)}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await validateDocument(apiDoc);
      });
    }
  }

  {
    const schemaDir = path.join(SCHEMAS_DIR, 'v2');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      it(`should be able to load valid openapi v2 schemas: ${getFileName(filePath)}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await validateDocument(apiDoc);
      });
    }
  }

  {
    const schemaDir = path.join(SCHEMAS_DIR, 'invalid');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      it(`should fail to load invalid openapi schemas: ${getFileName(filePath)}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await assertThrowsAsync(
          async () => validateDocument(apiDoc),
          /SchemaValidationException|SyntaxError/,
        );
      });
    }
  }
});
