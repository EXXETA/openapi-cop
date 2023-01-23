import * as path from 'path';

export const PROXY_PORT = Number(process.env.PROXY_PORT);
export const TARGET_SERVER_PORT = Number(process.env.TARGET_SERVER_PORT);
export const SERVER_RUNTIME: 'docker' | 'node' | string | undefined = process.env.SERVER_RUNTIME;

export const MOCK_SERVER_DIR = path.resolve(__dirname, '../../mock-server/');
export const SCHEMAS_DIR = path.resolve(__dirname, '../../test/schemas/');

export const DEFAULT_OPENAPI_FILE = path.join(
  SCHEMAS_DIR,
  'v3/7-petstore.yaml',
);
