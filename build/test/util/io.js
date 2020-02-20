"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
/**
 * Synchronously lists all top-level files in a directory.
 */
function* readDirFilesSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const pathToFile = path.join(dir, file);
        const isDirectory = fs.statSync(pathToFile).isDirectory();
        if (!isDirectory) {
            yield pathToFile;
        }
    }
}
exports.readDirFilesSync = readDirFilesSync;
/**
 * List all files in a directory recursively in a synchronous fashion.
 * https://gist.github.com/luciopaiva/4ba78a124704007c702d0293e7ff58dd
 */
function* walkSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const pathToFile = path.join(dir, file);
        const isDirectory = fs.statSync(pathToFile).isDirectory();
        if (isDirectory) {
            yield* walkSync(pathToFile);
        }
        else {
            yield pathToFile;
        }
    }
}
exports.walkSync = walkSync;
//# sourceMappingURL=io.js.map