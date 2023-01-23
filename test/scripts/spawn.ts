/**
 * Utility script for spawning a openapi-cop instance and a mock server in parallel
 * that are both based on a given OpenAPI document.
 *
 * node ./spawn [openapi-path]
 *
 *     openapi-path (optional): path to the OpenAPI file on which both the proxy server
 *             and the mock server will be based on. If the file path is relative, it is relative to the project base.
 *             Defaults to a hard-coded file (see below).
 *
 * This script is called/aliased by `npm run dev-start-along-mock`.
 */

import * as path from 'path';

import { PROXY_PORT, TARGET_SERVER_PORT } from '../config';
import { spawnProxyWithMockServer } from '../util/server';

const apiDocRelativePath = process.argv[2]
  ? process.argv[2]
  : 'test/schemas/v3/3-parameters.yaml';
const apiDocPath = path.resolve(__dirname, '../../..', apiDocRelativePath);

spawnProxyWithMockServer(
  {
    host: 'localhost',
    port: PROXY_PORT,
    targetUrl: `http://localhost:${TARGET_SERVER_PORT}`,
    apiDocPath,
  },
  {
    port: TARGET_SERVER_PORT,
    apiDocFile: apiDocPath,
  },
  {
    stdio: 'inherit',
  },
);
