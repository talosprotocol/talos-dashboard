const fs = require('fs');
const path = require('path');

const tsconfigPath = path.join(__dirname, '../tsconfig.json');
const tsconfig = require(tsconfigPath);

// Remove the local path alias for contracts to force using the installed package
if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
  delete tsconfig.compilerOptions.paths['@talos-protocol/contracts'];
}

fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
console.log('Cleaned tsconfig.json for production build');
