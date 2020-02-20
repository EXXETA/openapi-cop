"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
exports.MOCK_SERVER_DIR = path.resolve(__dirname, '../../mock/');
exports.SCHEMAS_DIR = path.resolve(__dirname, '../../schemas/');
exports.PROXY_PORT = 8888;
exports.TARGET_SERVER_PORT = 8889;
exports.DEFAULT_OPENAPI_FILE = path.join(exports.SCHEMAS_DIR, 'v3/7-petstore.yaml');
//# sourceMappingURL=config.js.map