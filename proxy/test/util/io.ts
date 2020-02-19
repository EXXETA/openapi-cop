import * as fs from 'fs';
import * as path from 'path';

/**
 * Synchronously lists all top-level files in a directory.
 */
export function* readDirFilesSync(dir: string): IterableIterator<string> {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const pathToFile = path.join(dir, file);
    const isDirectory = fs.statSync(pathToFile).isDirectory();
    if (!isDirectory) {
      yield pathToFile;
    }
  }
}

/**
 * List all files in a directory recursively in a synchronous fashion.
 * https://gist.github.com/luciopaiva/4ba78a124704007c702d0293e7ff58dd
 */
export function* walkSync(dir: string): IterableIterator<string> {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const pathToFile = path.join(dir, file);
    const isDirectory = fs.statSync(pathToFile).isDirectory();
    if (isDirectory) {
      yield* walkSync(pathToFile);
    } else {
      yield pathToFile;
    }
  }
}
