/**
 * Patches Node's module resolver so that .js imports resolve to .ts files
 * when the .js file does not exist. Required for TypeORM CLI + ts-node + nodenext.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.endsWith('.js') && parent?.filename) {
    const dir = path.dirname(parent.filename);
    const jsPath = path.resolve(dir, request);
    if (!fs.existsSync(jsPath)) {
      const tsPath = jsPath.replace(/\.js$/, '.ts');
      if (fs.existsSync(tsPath)) {
        return originalResolve.call(
          this,
          request.replace(/\.js$/, '.ts'),
          parent,
          isMain,
          options,
        );
      }
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
