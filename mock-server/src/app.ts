const debugMod = require('debug');
const debug = debugMod('openapi-cop:mock');
import chalk = require('chalk');
import 'source-map-support/register';

import * as errorHandler from 'errorhandler';
import * as express from 'express';
import { Request, Response } from 'express';
import * as refParser from 'json-schema-ref-parser';
import * as morgan from 'morgan';
import OpenAPIBackend, { Request as OpenAPIRequest } from 'openapi-backend';
import { OpenAPIV3 } from 'openapi-types';
import * as path from 'path';
import * as http from 'http';

import { readJsonOrYamlSync } from './util';

export async function buildApp(
	apiDocFile: string,
): Promise<express.Application> {
	const apiDocRaw = readJsonOrYamlSync(apiDocFile);
	const apiDoc = await refParser.dereference(apiDocFile, apiDocRaw, {});

	const api = buildApi(apiDocFile, apiDoc);
	await api.init();
	debug(
		`Loaded API definition for ${path.basename(apiDocFile)} ("${
			api.document.info.title
		}", version: ${api.document.info.version})`,
	);

	return buildExpressApp(api);
}

/** Configures and build the OpenAPIBackend express middleware. */
export function buildApi(apiDocFile: string, apiDoc: any): OpenAPIBackend {
	return new OpenAPIBackend({
		definition: apiDoc as OpenAPIV3.Document,
		strict: true,
		validate: false,
		ajvOpts: { unknownFormats: ['int32', 'int64', 'float', 'double'] },
		handlers: {
			validationFail: async (c, _req: Request, res: Response) => {
				if (!c) return;
				res.setHeader('openapi-cop-openapi-file', apiDocFile);
				res.status(400).json({ validation: c.validation });
			},
			notFound: async (c, _req: Request, res: Response) => {
				if (!c) return;
				// c.operationId is not defined, but c.operation is
				if (c.operation) {
					debug(
						'Cannot mock operation without an "operationId". Responding with 404.',
					);
				}
				res.setHeader('openapi-cop-openapi-file', apiDocFile);
				res.status(404).json({ error: 'not found' });
			},
			notImplemented: async (c, _req: Request, res: Response) => {
				if (!c) return;
				res.setHeader('openapi-cop-openapi-file', apiDocFile);

				if (!c.operation || !c.operation.operationId) {
					debug('Cannot mock operation without an "operationId"');
					return res.status(404).json({ error: 'not found' });
				}
				const { status, mock } = c.api.mockResponseForOperation(
					c.operation.operationId,
				);

				return res.status(status).json(mock);
			},
		},
	});
}

/**
 * Creates an express app and attaches a OpenAPIBackend middleware instance to
 * it.
 */
export async function buildExpressApp(
	api: OpenAPIBackend,
): Promise<express.Application> {
	const app: express.Application = express();
	app.use(express.json());

	if (debugMod.enabled('openapi-cop:mock')) {
		// Logging of the form "openapi-cop:mock METHOD /url 123B (50ms)"
		app.use(
			morgan((tokens, req, res) => {
				return [
					chalk.bold('  openapi-cop:mock'),
					tokens.method(req, res),
					tokens.url(req, res),
					tokens.status(req, res),
					tokens.res(req, res, 'content-length') + 'B',
					'(' + tokens['response-time'](req, res),
					'ms)',
				].join(' ');
			}),
		);
	}

	// Attach OpenAPI backend
	app.use((req, res) => api.handleRequest(req as OpenAPIRequest, req, res));

	app.use(
		// tslint:disable-next-line:no-any
		(err: any, _req: Request, res: Response) => {
			console.error(err.stack);
			res.status(500).send('Server error');
		},
	);

	// Display full error stack traces
	if (process.env.NODE_ENV === 'development') {
		app.use(errorHandler());
	}

	return app;
}

export type MockOptions = BaseMockOptions & ExtendedMockOptions;

export interface BaseMockOptions {
	port: string | number;
}

export interface ExtendedMockOptions {
	apiDocFile: string;
}

/** Builds the app and runs it on the given port. */
export async function runApp({ port, apiDocFile }: MockOptions): Promise<http.Server> {
	try {
		const app = await buildApp(apiDocFile);
		let server: http.Server;
		return new Promise<http.Server>((resolve) => {
			server = app.listen(port, () => {
				resolve(server);
			});
		}).then(() => {
			return server;
		});
	} catch (error) {
		console.error('Failed to run mock server', error);
		return Promise.reject();
	}
}
