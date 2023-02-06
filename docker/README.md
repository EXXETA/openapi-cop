# openapi-cop

OpenAPI **Co**mpliance **P**roxy that validates requests and responses against an OpenAPI document.

## Concept

Place the proxy between a client (e.g. a frontend app) and a web server to catch invalid requests or responses during
development.

<p align="center">
  <img src="https://raw.githubusercontent.com/EXXETA/openapi-cop/main/docs/resources/diagram.png" alt="Proxy Diagram" width="571.5">
</p>

The proxy validates the requests and responses in the communication with a target server. By default, the proxy will
respond with a 500 status code when the validation fails. In production environments, you can set the _silent_ flag to
forward unmodified response bodies.

You can find more information at the [GitHub page](https://github.com/EXXETA/openapi-cop).

## Usage

Inside the container, openapi-cop will listen on 0.0.0.0 and port 8888. You
should [expose](https://docs.docker.com/config/containers/container-networking/) this port to the host. Make sure
as well that the container running openapi-cop has access to the target server (see TARGET below).

The image accepts the following environment variables, which correspond to the
same [openapi-cop CLI flags](https://github.com/EXXETA/openapi-cop#cli-usage):

- `TARGET`: Full base path of the target API (format: http(s)://host:port/basePath).
- `FILE`: The file path or URI pointing to the OpenAPI definition file. Supports JSON or YAML.
- `DEFAULT_FORBID_ADDITIONAL_PROPERTIES`: When set, additional properties that are not present in the OpenAPI definition
  are not allowed.
- `SILENT`: When set, the proxy will forward response bodies unchanged and only set validation headers.
- `VERBOSE`: When set, activates verbose output.
- `CLI_ARGUMENTS`: Sets all the arguments at once and overrides any other option given.
- `NODE_ENV` (default: "production"): When set to "development", stack traces will also be logged.

### Example

The following command will run the proxy against a provided target server, taking as a reference a given local
openapi.json file and running in "silent" mode, and use the host's network.

```bash
docker run -it --network="host" \
    -v "$(pwd)/local/openapi.json:/openapi.json" \
    --env "TARGET=http://my-target-server:1234/baseApi/v1" \
    --env "FILE=/openapi.json" \
    --env "SILENT=1" \
    lxlu/openapi-cop
```

Then `curl http://0.0.0.0:8888/some-target-endpoint` will respond the same
as `curl http://my-target-server:1234/baseApi/v1/some-target-endpoint` but with additional openapi-cop headers.

## License

See https://github.com/EXXETA/openapi-cop/blob/main/LICENSE.
