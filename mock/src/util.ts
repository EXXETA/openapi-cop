import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// tslint:disable-next-line:no-any
export function readJsonOrYamlSync(filePath: string): any {
  switch (path.extname(filePath)) {
    case '.json':
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    case '.yaml':
    case '.yml':
      return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    case '.':
      throw new Error('Will not convert a file that has no extension.');
    default:
      throw new Error('Wrong file extension.');
  }
}
