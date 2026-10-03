// SQLite usa Node-API 6, compatible con el Electron de estas aplicaciones.
// Preparamos cada arquitectura de macOS antes de que electron-builder la copie.
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');

module.exports = async function prepareSqlite(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const projectRequire = createRequire(path.join(context.packager.projectDir, 'package.json'));
  const builderRequire = createRequire(projectRequire.resolve('app-builder-lib/package.json'));
  const { Arch } = builderRequire('builder-util');
  const architecture = Arch[context.arch];
  if (!['x64', 'arm64'].includes(architecture)) throw new Error('Arquitectura SQLite no admitida: ' + architecture);
  const sqlitePackagePath = projectRequire.resolve('sqlite3/package.json');
  const sqlitePackage = projectRequire('sqlite3/package.json');
  if (!sqlitePackage.binary.napi_versions.includes(6)) throw new Error('SQLite no ofrece Node-API 6');
  const sqliteRequire = createRequire(sqlitePackagePath);
  const cli = sqliteRequire.resolve('prebuild-install/bin.js');
  const args = [cli, '--runtime=napi', '--target=6', '--platform=darwin', '--arch=' + architecture, '--force', '--verbose'];
  console.log('Preparando SQLite ' + sqlitePackage.version + ' para macOS ' + architecture + ', Node-API 6');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: path.dirname(sqlitePackagePath), stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error('No se pudo preparar SQLite para ' + architecture)));
  });
};
