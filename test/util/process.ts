import { exec as _exec } from 'child_process';
import * as util from 'util';
import { flatMap } from 'lodash';
import findProcess = require('find-process');

const exec = util.promisify(_exec);

export async function killNodeProcesses(
  ports: Array<string | number>,
): Promise<any> {
  const processResults = await Promise.all(
    ports.map((port) => findProcess('port', port)),
  );
  return killProcesses(
    flatMap(processResults, (results) =>
      flatMap(results, (process) =>
        process.cmd.includes('node') ? process.pid : [],
      ),
    ),
  );
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
