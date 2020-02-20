"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util = require("util");
const exec = util.promisify(child_process_1.exec);
/** Kills all processes that are listening on a given port. */
async function killOnPort(port) {
    if (!port) {
        return Promise.reject(new Error('Invalid argument provided for port'));
    }
    if (process.platform === 'win32') {
        return exec(`netstat -ano | grep :${port} | grep :LISTEN | awk '{print $5}' | uniq | xargs -n1 -I{} tskill {} /A /V`);
    }
    else {
        return exec(`lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | uniq | xargs -n1 kill -9`);
    }
}
exports.killOnPort = killOnPort;
/** Kills many processes by their PIDs. */
function killProcesses(pids) {
    return Promise.all(pids.map(pid => killProcess(pid)));
}
exports.killProcesses = killProcesses;
/** Kills a process given its PID. */
async function killProcess(pid) {
    const isWin = /^win/.test(process.platform);
    if (!pid)
        return Promise.resolve();
    try {
        if (!isWin) {
            await exec('kill -9 ' + pid);
        }
        else {
            await exec('taskkill /pid ' + pid + ' /f /t');
        }
    }
    catch (ex) {
        if (!/not found/.test(ex.stderr)) {
            console.log('Failed to kill child process:', ex);
        }
    }
}
exports.killProcess = killProcess;
//# sourceMappingURL=process.js.map