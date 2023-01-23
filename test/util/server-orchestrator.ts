import { killProxyAndMock } from './process';
import { PROXY_PORT, TARGET_SERVER_PORT } from '../config';
import {
  BaseProxyOptions,
  ExtendedProxyOptions,
  ProxyOptions,
  runProxy as runProxyServer,
} from '../../src/app';
import {
  BaseMockOptions,
  ExtendedMockOptions,
  MockOptions,
  runApp as runMockServer,
} from '@exxeta/openapi-cop-mock-server';
import { closeServer } from '../../src/util';
import { Server } from 'http';
import { URL } from 'url';

export enum ServerRole {
  Proxy = 'proxy',
  MockTarget = 'mock',
}

export abstract class ServerOrchestrator {
  protected servers: {
    [ServerRole.Proxy]?: Server;
    [ServerRole.MockTarget]?: Server;
  } = {};

  constructor(protected proxyUrl: URL, protected targetUrl: URL) {}

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

  public abstract start(
    server: ServerRole,
    options: ProxyOptions | MockOptions,
    useExisting?: boolean,
  ): Promise<Server>;

  public abstract stop(server: ServerRole): Promise<void>;

  public abstract kill(): Promise<void>;

  public clone(): ServerOrchestrator {
    return new (this.constructor as typeof NodeHttpServerOrchestrator)(
      this.proxyUrl,
      this.targetUrl,
    );
  }

  async startAll(
    proxyOptions: ExtendedProxyOptions,
  ): Promise<Record<ServerRole, Server>> {
    console.log('Starting servers...');
    return {
      [ServerRole.Proxy]: await this.start(ServerRole.Proxy, {
        ...this.proxyOptions,
        ...proxyOptions,
      }),
      [ServerRole.MockTarget]: await this.start(ServerRole.MockTarget, {
        ...this.mockOptions,
        apiDocFile: proxyOptions?.apiDocPath,
      }),
    };
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
    this.servers = await this.startAll(proxyOptions);
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
    this.servers[ServerRole.Proxy] = await this.start(ServerRole.Proxy, {
      ...this.proxyOptions,
      ...proxyOptions,
    });
    await task();
    await this.stop(ServerRole.Proxy);
  }

  public async withMock({
    task,
    mockOptions,
    useExisting,
  }: {
    task: () => Promise<void>;
    mockOptions: ExtendedMockOptions;
    useExisting?: boolean;
  }): Promise<void> {
    this.servers[ServerRole.MockTarget] = await this.start(
      ServerRole.MockTarget,
      {
        ...this.mockOptions,
        apiDocFile: mockOptions.apiDocFile,
      },
      useExisting,
    );
    await task();
    await this.stop(ServerRole.MockTarget);
  }

  setMock(server: Server): void {
    this.servers[ServerRole.MockTarget] = server;
  }
}

/**
 * This orchestrator starts Express servers directly on the main process.
 */
export class NodeHttpServerOrchestrator extends ServerOrchestrator {
  async start(
    serverRole: ServerRole,
    options: ProxyOptions | MockOptions,
    useExisting?: boolean,
  ): Promise<Server> {
    const server = this.servers[serverRole];
    if (server instanceof Server && useExisting) {
      return server;
    }

    switch (serverRole) {
      case ServerRole.Proxy:
        return runProxyServer(options as ProxyOptions);
      case ServerRole.MockTarget:
        return runMockServer(options as MockOptions);
    }
  }

  async stop(serverRole: ServerRole): Promise<void> {
    const server = this.servers[serverRole];
    if (!server) {
      return;
    }
    await closeServer(server);
  }

  kill(): Promise<void> {
    return killProxyAndMock(PROXY_PORT, TARGET_SERVER_PORT);
  }
}

export class DockerServerOrchestrator extends NodeHttpServerOrchestrator {
  async start(
    serverRole: ServerRole,
    options: ProxyOptions | MockOptions,
    useExisting?: boolean,
  ): Promise<Server> {
    // TODO
    return Promise.resolve(null as any);
  }

  async stop(serverRole: ServerRole): Promise<void> {
    // TODO
  }

  kill(): Promise<void> {
    return killProxyAndMock(PROXY_PORT, TARGET_SERVER_PORT);
  }
}
