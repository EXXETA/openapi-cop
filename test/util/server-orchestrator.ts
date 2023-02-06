import { killNodeProcesses } from './process';
import {
  BaseProxyOptions,
  ExtendedProxyOptions,
  ProxyOptions,
  runProxy as runProxyServer,
} from '../../src/app';
import {
  BaseMockOptions,
  MockOptions,
  runApp as runMockServer,
} from '@exxeta/openapi-cop-mock-server';
import { Server } from 'http';
import { URL } from 'url';
import { ChildProcess } from 'child_process';
import {
  closeServer,
  killDockerProxyServer,
  spawnDockerProxyServer,
} from './server';

export enum ServerRole {
  Proxy = 'proxy',
  MockTarget = 'mock',
}

export abstract class ServerOrchestrator<S extends Server | ChildProcess> {
  protected servers: {
    [ServerRole.Proxy]?: S;
    [ServerRole.MockTarget]?: S;
  } = {};

  constructor(public readonly proxyUrl: URL, public readonly targetUrl: URL) {}

  get proxyOptions(): BaseProxyOptions {
    return {
      port: this.proxyUrl.port,
      host: this.proxyUrl.hostname,
      targetUrl: this.targetUrl.toString(),
    };
  }

  get mockOptions(): BaseMockOptions {
    return {
      port: this.targetUrl.port,
    };
  }

  get options(): {
    [ServerRole.Proxy]: BaseProxyOptions;
    [ServerRole.MockTarget]: BaseMockOptions;
  } {
    return {
      proxy: this.proxyOptions,
      mock: this.mockOptions,
    };
  }

  public abstract start(
    server: ServerRole,
    options: ProxyOptions | MockOptions,
  ): Promise<S>;

  public abstract stop(server: ServerRole): Promise<void>;

  public abstract kill(): Promise<void>;

  async startAll(proxyOptions: ExtendedProxyOptions): Promise<Array<S>> {
    console.log('Starting servers...');
    return Promise.all([
      this.start(ServerRole.Proxy, {
        ...this.proxyOptions,
        ...proxyOptions,
      }),
      this.start(ServerRole.MockTarget, {
        ...this.mockOptions,
        apiDocFile: proxyOptions?.apiDocPath,
      }),
    ]);
  }

  async stopAll(): Promise<void> {
    console.log('Shutting down servers...');
    if (!this.servers) {
      return;
    }
    await Promise.all([
      this.stop(ServerRole.Proxy),
      this.stop(ServerRole.MockTarget),
    ]);
  }

  /**
   * Starts the servers, performs a task and finally shuts the servers down.
   *
   * @param task A function to be executed after the servers are up. Afterwards the servers are shut down again.
   * @param proxyOptions Temporal proxy options to set only for the execution of this task.
   */
  public async withServers({
    task,
    proxyOptions,
  }: {
    task: () => Promise<void>;
    proxyOptions: ExtendedProxyOptions;
  }): Promise<void> {
    await this.startAll(proxyOptions);
    console.log('Started both servers!');
    await task();
    await this.stopAll();
  }

  public async withProxy({
    task,
    proxyOptions,
  }: {
    task: () => Promise<void>;
    proxyOptions: ExtendedProxyOptions;
  }): Promise<void> {
    await this.start(ServerRole.Proxy, {
      ...this.proxyOptions,
      ...proxyOptions,
    });
    await task();
    await this.stop(ServerRole.Proxy);
  }
}

/**
 * This orchestrator starts Express servers directly on the main process.
 */
export class NodeHttpServerOrchestrator extends ServerOrchestrator<Server> {
  async start(
    serverRole: ServerRole,
    options: ProxyOptions | MockOptions,
  ): Promise<Server> {
    switch (serverRole) {
      case ServerRole.Proxy: {
        this.servers[serverRole] = await runProxyServer(
          options as ProxyOptions,
        );
        break;
      }
      case ServerRole.MockTarget: {
        this.servers[serverRole] = await runMockServer(options as MockOptions);
        break;
      }
    }

    return this.servers[serverRole] as Server;
  }

  async stop(serverRole: ServerRole): Promise<void> {
    const server = this.servers[serverRole];
    if (!server) {
      return;
    }
    await closeServer(server, this.options[serverRole].port);
  }

  kill(): Promise<void> {
    return killNodeProcesses([this.proxyOptions.port, this.mockOptions.port]);
  }
}

export class DockerServerOrchestrator extends ServerOrchestrator<
  Server | ChildProcess
> {
  private mockServerOrchestrator = new NodeHttpServerOrchestrator(
    this.proxyUrl,
    this.targetUrl,
  );

  async start(
    serverRole: ServerRole,
    options: ProxyOptions | MockOptions,
  ): Promise<Server | ChildProcess> {
    if (serverRole === ServerRole.Proxy) {
      console.log('Starting docker proxy server...');
      this.servers[serverRole] = await spawnDockerProxyServer(
        options as ProxyOptions,
        { detached: true, stdio: 'inherit' },
        true,
      );
      console.log('Spawned docker proxy server!');
      return this.servers[serverRole] as ChildProcess;
    } else {
      this.servers[serverRole] = await this.mockServerOrchestrator.start(
        ServerRole.MockTarget,
        options,
      );
      return this.servers[serverRole] as Server;
    }
  }

  async stop(serverRole: ServerRole): Promise<void> {
    if (serverRole === ServerRole.Proxy) {
      await killDockerProxyServer(this.proxyOptions);
    } else {
      await this.mockServerOrchestrator.stop(ServerRole.MockTarget);
    }
  }

  async kill(): Promise<void> {
    await Promise.all([
      killNodeProcesses([this.mockOptions.port]),
      killDockerProxyServer(this.proxyOptions),
    ]);
  }
}
