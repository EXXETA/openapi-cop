/// <reference types="node" />
import * as express from 'express';
import * as http from 'http';
interface BuildOptions {
    targetUrl: string;
    apiDocFile: string;
    defaultForbidAdditionalProperties?: boolean;
    silent?: boolean;
}
interface ProxyOptions {
    port: number;
    host: string;
    targetUrl: string;
    apiDocFile: string;
    defaultForbidAdditionalProperties?: boolean;
    silent?: boolean;
}
/**
 * Builds a new express app instance, and attaches all necessary middleware.
 */
export declare function buildApp(options: BuildOptions): Promise<express.Application>;
/**
 * Builds the proxy and runs it on the given port.
 * @param proxy The port on which the proxy will run.
 * @param host The host name or IP address of the proxy server.
 * @param targetUrl The URL the proxy routes from.
 * @param apiDocFile The OpenAPI document path used to perform validation.
 * @param defaultForbidAdditionalProperties Whether additional properties are
 * allowed in requests and responses.
 * @param silent Do not respond with 500 status when validation fails, but leave
 * the server response untouched
 */
export declare function runProxy({ port, host, targetUrl, apiDocFile, defaultForbidAdditionalProperties, silent, }: ProxyOptions): Promise<http.Server>;
export {};
