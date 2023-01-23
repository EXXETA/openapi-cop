import { exec as _exec } from 'child_process';
import * as util from 'util';
import findProcess = require('find-process');

const exec = util.promisify(_exec);

export async function killProxyAndMock(
  proxyPort: number | string,
  mockServerPort: number | string,
): Promise<any> {
  const pid1 = await findProcess('port', proxyPort);
  const pid2 = await findProcess('port', mockServerPort);

  await killProcesses([
    ...pid1.filter((p) => p.cmd.indexOf('node') !== -1).map((p) => p.pid),
    ...pid2.filter((p) => p.cmd.indexOf('node') !== -1).map((p) => p.pid),
  ]);
}

/** Kills many processes by their PIDs. */
export function killProcesses(pids: number[]): Promise<Array<any>> {
  return Promise.all(pids.map((pid) => killProcess(pid)));
}

/** Kills a process given its PID. */
export async function killProcess(pid: number): Promise<any> {
  const isWin = /^win/.test(process.platform);
  if (!pid) return Promise.resolve();

  const command = !isWin ? `kill -9 ${pid}` : `taskkill /pid ${pid} /f /t`;
  const { stderr } = await exec(command);

  if (stderr && !/not found/.test(stderr)) {
    console.log('Failed to kill child process:', stderr);
  }
}
