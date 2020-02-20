/**
 * Synchronously lists all top-level files in a directory.
 */
export declare function readDirFilesSync(dir: string): IterableIterator<string>;
/**
 * List all files in a directory recursively in a synchronous fashion.
 * https://gist.github.com/luciopaiva/4ba78a124704007c702d0293e7ff58dd
 */
export declare function walkSync(dir: string): IterableIterator<string>;
