import * as path from 'path';

import { readJsonOrYamlSync } from '../src/util';
import { validateDocument } from '../src/validation';

import { SCHEMAS_DIR } from './config';
import { readDirFilesSync } from './util/io';
import { assertThrowsAsync } from './util/testing';

// tslint:disable: only-arrow-functions
describe('Loading and validation of OpenAPI schemas', function() {
  {
    const schemaDir = path.join(SCHEMAS_DIR, 'v3');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      const fileName = path
        .normalize(path.basename(filePath))
        .replace(/\\/g, '/');
      it(`should be able to load valid openapi v3 schemas: ${fileName}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await validateDocument(apiDoc);
      });
    }
  }

  {
    const schemaDir = path.join(SCHEMAS_DIR, 'v2');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      const fileName = path
        .normalize(path.basename(filePath))
        .replace(/\\/g, '/');
      it(`should be able to load valid openapi v2 schemas: ${fileName}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await validateDocument(apiDoc);
      });
    }
  }

  {
    const schemaDir = path.join(SCHEMAS_DIR, 'invalid');
    process.chdir(schemaDir);
    for (const filePath of readDirFilesSync(schemaDir)) {
      const fileName = path
        .normalize(path.basename(filePath))
        .replace(/\\/g, '/');
      it(`should fail to load invalid openapi schemas: ${fileName}`, async function() {
        const apiDoc = readJsonOrYamlSync(filePath);
        await assertThrowsAsync(
          async () => validateDocument(apiDoc),
          /SchemaValidationException|SyntaxError/
        );
      });
    }
  }
});
