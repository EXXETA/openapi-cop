/** Kills all processes that are listening on a given port. */
export declare function killOnPort(port: number | string): Promise<any>;
/** Kills many processes by their PIDs. */
export declare function killProcesses(pids: number[]): Promise<any[]>;
/** Kills a process given its PID. */
export declare function killProcess(pid: number): Promise<any>;
