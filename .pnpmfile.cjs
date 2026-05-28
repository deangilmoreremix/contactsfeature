/**
 * pnpm configuration to allow build scripts for packages that need native compilation
 */
module.exports = {
  hooks: {
    readPackage(resolveResult, fetchResult) {
      // Allow @parcel/watcher and esbuild to run postinstall scripts
      if (resolveResult.name === '@parcel/watcher' || resolveResult.name === 'esbuild' || resolveResult.name === 'core-js-pure') {
        resolveResult.pnpm = resolveResult.pnpm || {};
        resolveResult.pnpm.allowedScripts = ['postinstall', 'preinstall', 'install'];
      }
      return resolveResult;
    }
  }
};