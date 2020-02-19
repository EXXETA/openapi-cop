# openapi-cop

_openapi-cop_ is a set of proxy tools to validate responses and requests against an OpenAPI definition. Currently, only the proxy server integration is available.

## Proxy server integration

The developer typically has no control over the backend environment and wants to run the proxy locally to monitor API requests and responses. The proxy can be plugged into a CI or used during local development.

### Installation

Do `npm install -g openapi-cop`, or `npm install openapi-cop` to install locally.

You can of course also install the package provided in the release with `npm install ./proxy/openapi-cop.tgz`.

### CLI Usage

The *openapi-cop* node package installs itself as an executable linked as `openapi-cop`. Run the command with the `--help` flag to get information about the CLI:

```txt
Usage: openapi-cop [options]

Options:
  -s, --file <file>                       path to the OpenAPI definition file
  -h, --host <host>                       the host of the proxy server (default: "localhost")
  -p, --port <port>                       port number on which to run the proxy (default: 8888)
  -t, --target <target>                   full base path of the target API (format: http(s)://host:port/basePath)
  --default-forbid-additional-properties  disallow additional properties when not explicitly specified
  --silent                                do not send responses with validation errors, just set validation headers
  -w, --watch [watchLocation]             watch for changes in a file or directory (falls back to the OpenAPI file)
                                             and restart server accordingly
  -v, --verbose                           show verbose output
  -V, --version                           output the version number
  -h, --help                              output usage information
```

The proxy validates the requests and responses in the communication with a target server. By default, the proxy will respond with a 500 status code when the validation fails.

<details><summary>Sample validation failure response</summary>

```json
{
    "error": {
        "message": "openapi-cop Proxy validation failed",
        "request": {
            "method": "POST",
            "path": "/pets",
            "headers": {
                "host": "localhost:8888",
                "user-agent": "curl/7.59.0",
                "accept": "*/*",
                "content-type": "application/json",
                "content-length": "16"
            },
            "query": {},
            "body": {
                "data": "sent"
            }
        },
        "response": {
            "statusCode": 201,
            "body": "{}",
            "headers": {
                "x-powered-by": "Express",
                "openapi-cop-openapi-file": "7-petstore.yaml",
                "content-type": "application/json; charset=utf-8",
                "content-length": "2",
                "etag": "W/\"2-vyGp6PvFo4RvsFtPoIWeCReyIC8\"",
                "date": "Thu, 25 Jul 2019 13:39:58 GMT",
                "connection": "close"
            },
            "request": {
                "uri": {
                    "protocol": "http:",
                    "slashes": true,
                    "auth": null,
                    "host": "localhost:8889",
                    "port": "8889",
                    "hostname": "localhost",
                    "hash": null,
                    "search": null,
                    "query": null,
                    "pathname": "/pets",
                    "path": "/pets",
                    "href": "http://localhost:8889/pets"
                },
                "method": "POST",
                "headers": {
                    "host": "localhost:8888",
                    "user-agent": "curl/7.59.0",
                    "accept": "*/*",
                    "content-type": "application/json",
                    "content-length": "16",
                    "accept-encoding": "gzip, deflate"
                }
            }
        },
        "validationResults": {
            "request": {
                "valid": true,
                "errors": null
            },
            "response": {
                "valid": false,
                "errors": [
                    {
                        "keyword": "required",
                        "dataPath": "",
                        "schemaPath": "#/required",
                        "params": {
                            "missingProperty": "code"
                        },
                        "message": "should have required property 'code'"
                    }
                ]
            },
            "responseHeaders": {
                "valid": true,
                "errors": null
            }
        }
    }
}
```

</details>

Two headers are added to the response:

- `openapi-cop-validation-result`: contains the validation results as JSON.
  <details><summary>Interface</summary>

  ```ts
  {
      request: {
        valid: boolean;
        errors?: Ajv.ErrorObject[] | null;
      },
      response: {
        valid: boolean;
        errors?: Ajv.ErrorObject[] | null;
      },
      responseHeaders: {
        valid: boolean;
        errors?: Ajv.ErrorObject[] | null;
      }
  }
  ```

  </details>
  
- `openapi-cop-source-request`: contains a simplified version of the original request sent by the client as JSON.

  <details><summary>Interface</summary>

  ```ts
  {
    method: string;
    path: string;
    headers: {
      [key: string]: string | string[];
    };
    query?: {
      [key: string]: string | string[];
    } | string;
    body?: any;
  }
  ```

  </details>

See the references of [OpenAPI Backend](https://github.com/anttiviljami/openapi-backend/blob/master/DOCS.md) and [Ajv](https://ajv.js.org/) for more information.

When the `--silent` is provided, the proxy will forward the server's response body without modification. In this case, the validation headers are still added.

#### Module Usage

To run the proxy programatically use `runProxy`, which returns a `Promise<http.Server>`:

```ts
import {runProxy} from 'openapi-cop';

const server = await runProxy({
  port: 8888,
  host: 'proxyhost',
  targetUrl: 'http://targethost:8989',
  apiDocFile: '/path/to/openapi-file.yaml',
  defaultForbidAdditionalProperties: false,
  silent: false
});
```
