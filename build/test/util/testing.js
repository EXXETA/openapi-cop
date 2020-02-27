"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug');
const assert = require("assert");
const child_process_1 = require("child_process");
const path = require("path");
const waitOn = require("wait-on");
const chalk_1 = require("chalk");
const config_1 = require("../config");
const app_1 = require("../../src/app");
const openapi_cop_mock_server_1 = require("openapi-cop-mock-server");
const util_1 = require("../../src/util");
const io_1 = require("./io");
/**
 * Formats a request in a compact way, i.e. METHOD /url {...}
 * Example:
 *     POST /echo {"input":"Marco!"}
 * @param req
 */
function formatRequest(req) {
    const s = `${req.method} ${req.url}`;
    if (typeof req.data !== 'undefined') {
        const data = typeof req.data === 'string' ? req.data : JSON.stringify(req.data);
        return s + ' ' + data;
    }
    else {
        return s;
    }
}
exports.formatRequest = formatRequest;
async function assertThrowsAsync(fn, regExp) {
    let f = () => { };
    try {
        await fn();
    }
    catch (e) {
        f = () => {
            throw e;
        };
    }
    finally {
        assert.throws(f, regExp);
    }
}
exports.assertThrowsAsync = assertThrowsAsync;
/**
 * Executes a function within the context of a proxy and a mock server.
 * Resources are created before execution and cleaned up thereafter.
 */
async function withServers({ apiDocFile, callback, defaultForbidAdditionalProperties, silent, }) {
    console.log('Starting servers...');
    const servers = {
        proxy: await app_1.runProxy({
            port: config_1.PROXY_PORT,
            host: 'localhost',
            targetUrl: `http://localhost:${config_1.TARGET_SERVER_PORT}`,
            apiDocFile,
            defaultForbidAdditionalProperties,
            silent,
        }),
        mock: await openapi_cop_mock_server_1.runApp(config_1.TARGET_SERVER_PORT, apiDocFile),
    };
    console.log('Running test...');
    await callback();
    console.log('Shutting down servers...');
    await Promise.all([util_1.closeServer(servers.proxy), util_1.closeServer(servers.mock)]);
}
exports.withServers = withServers;
/**
 * For each OpenAPI file in a given directory, it boots a proxy and a mock
 * server and runs the provided test requests. It then executes the callback
 * function that contains the test code.
 */
function testRequestForEachFile({ testTitle, dir, testRequests, client, callback, defaultForbidAdditionalProperties = false, silent = false, }) {
    // tslint:disable:only-arrow-functions
    for (const p of io_1.readDirFilesSync(dir)) {
        const fileName = path.normalize(path.basename(p)).replace(/\\/g, '/');
        it(`${testTitle}: ${fileName}`, async function () {
            // Skip if no test requests exist for the OpenAPI definition
            if (!(fileName in testRequests)) {
                console.log(chalk_1.default.keyword('orange')(`Skipping '${fileName}' due to missing test requests.`));
                return;
            }
            await withServers({
                apiDocFile: p,
                defaultForbidAdditionalProperties,
                silent,
                async callback() {
                    // Perform all test requests on both servers yield responses
                    // to compare
                    for (const req of testRequests[fileName]) {
                        console.log(`Sending request ${formatRequest(req)}`);
                        const targetRes = await client.target(req);
                        const proxyRes = await client.proxy(req);
                        callback(proxyRes, targetRes, fileName, req);
                    }
                },
            });
        });
    }
}
exports.testRequestForEachFile = testRequestForEachFile;
/**
 * Spawns a proxy server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
async function spawnProxyServer(proxyPort, targetPort, apiDocFile, options = {}) {
    // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
    const cp = child_process_1.spawn('node', [
        '../../src/cli.js',
        '--port',
        proxyPort.toString(),
        '--target',
        `http://localhost:${targetPort}`,
        '--file',
        apiDocFile,
        '--verbose',
    ], { cwd: __dirname, stdio: 'pipe', detached: false, ...options });
    await waitOn({ resources: [`tcp:localhost:${proxyPort}`] });
    return cp;
}
exports.spawnProxyServer = spawnProxyServer;
/**
 * Spawns a mock server on a given port, using the default OpenAPI file.
 * Resources are created before execution and cleaned up thereafter.
 *
 * The `options` can be used to override the `child_process.spawn` options.
 */
async function spawnMockServer(port, apiDocFile, options = {}) {
    // NOTE: for debugging use the options {detached: true, stdio: 'inherit'}
    const cp = child_process_1.spawn('node', [
        './build/src/cli.js',
        '--port',
        port.toString(),
        '--file',
        apiDocFile,
        '--verbose',
    ], {
        cwd: config_1.MOCK_SERVER_DIR,
        stdio: debug.enabled('openapi-cop:mock') ? 'inherit' : 'ignore',
        detached: false,
        ...options,
    });
    await waitOn({ resources: [`tcp:localhost:${port}`] });
    return cp;
}
exports.spawnMockServer = spawnMockServer;
/**
 * Convenience function to spawn a proxy server along a mock server.
 */
async function spawnProxyWithMockServer(proxyPort, targetPort, apiDocFile, options = {}) {
    return {
        proxy: await spawnProxyServer(proxyPort, targetPort, apiDocFile, options),
        target: await spawnMockServer(targetPort, apiDocFile, options),
    };
}
exports.spawnProxyWithMockServer = spawnProxyWithMockServer;
/**
 * For each OpenAPI file in a given directory, it boots a proxy server, along
 * with a test target server and runs the provided test requests. It then
 * executes the callback function that contains the test code.
 */
function testRequestForEachFileWithServers({ testTitle, dir, testServers, client, callback, defaultForbidAdditionalProperties = false, }) {
    // tslint:disable:only-arrow-functions
    for (const apiDocFile of io_1.readDirFilesSync(dir)) {
        const fileName = path
            .normalize(path.basename(apiDocFile))
            .replace(/\\/g, '/');
        it(`${testTitle}: ${fileName}`, async function () {
            if (!(fileName in testServers)) {
                console.log(chalk_1.default.keyword('orange')(`Skipping '${fileName}' due to missing test target server.`));
                return;
            }
            if (testServers[fileName].length === 0) {
                // When no tests are present in the array, this is interpreted as an
                // intentional skip
                return;
            }
            console.log('Starting proxy server...');
            const proxyServer = await app_1.runProxy({
                port: config_1.PROXY_PORT,
                host: 'localhost',
                targetUrl: `http://localhost:${config_1.TARGET_SERVER_PORT}`,
                apiDocFile,
                defaultForbidAdditionalProperties,
            });
            console.log('Running test...');
            for (const { request, runServer, expectedError } of testServers[fileName]) {
                console.log('Starting some mock server...');
                const mockServer = await runServer();
                console.log(`Sending request ${formatRequest(request)}`);
                const targetRes = await client.target(request);
                const proxyRes = await client.proxy(request);
                callback(proxyRes, targetRes, fileName, expectedError);
                console.log('Shutting down mock server...');
                await util_1.closeServer(mockServer);
            }
            console.log('Shutting down proxy server...');
            await util_1.closeServer(proxyServer);
        });
    }
}
exports.testRequestForEachFileWithServers = testRequestForEachFileWithServers;
//# sourceMappingURL=testing.js.map