import { exec as _exec } from 'child_process';
import * as util from 'util';
const exec = util.promisify(_exec);

/** Kills all processes that are listening on a given port. */
export async function killOnPort(port: number | string): Promise<any> {
  if (!port) {
    return Promise.reject(new Error('Invalid argument provided for port'));
  }

  if (process.platform === 'win32') {
    return exec(
      `netstat -ano | grep :${port} | grep :LISTEN | awk '{print $5}' | uniq | xargs -n1 -I{} tskill {} /A /V`
    );
  } else {
    return exec(
      `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | uniq | xargs -n1 kill -9`
    );
  }
}

/** Kills many processes by their PIDs. */
export function killProcesses(pids: number[]) {
  return Promise.all(pids.map(pid => killProcess(pid)));
}

/** Kills a process given its PID. */
export async function killProcess(pid: number): Promise<any> {
  const isWin = /^win/.test(process.platform);
  if (!pid) return Promise.resolve();
  try {
    if (!isWin) {
      await exec('kill -9 ' + pid);
    } else {
      await exec('taskkill /pid ' + pid + ' /f /t');
    }
  } catch (ex) {
    if (!/not found/.test(ex.stderr)) {
      console.log('Failed to kill child process:', ex);
    }
  }
}
