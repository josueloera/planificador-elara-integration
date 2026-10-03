// Comprueba los archivos que consumirá electron-updater antes de publicarlos.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const builderRequire = createRequire(require.resolve('app-builder-lib/package.json'));
const yaml = builderRequire('js-yaml');

async function main() {
  const directory = path.resolve(process.argv[2] || 'release');
  const platform = process.argv[3] || 'all';
  if (!['win', 'mac', 'all'].includes(platform)) throw new Error('Plataforma inválida');
  const version = require('../package.json').version;
  const manifests = platform === 'win' ? ['latest.yml']
    : platform === 'mac' ? ['latest-mac.yml'] : ['latest.yml', 'latest-mac.yml'];
  const artifacts = new Map();

  async function inspect(name) {
    if (!name || path.basename(name) !== name || /[/\\]/.test(name)) {
      throw new Error(`Nombre de archivo inválido: ${name}`);
    }
    if (artifacts.has(name)) return artifacts.get(name);
    const file = path.join(directory, name);
    const size = fs.statSync(file).size;
    if (!size) throw new Error(`Archivo vacío: ${name}`);
    const sha512 = crypto.createHash('sha512');
    const sha256 = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) {
      sha512.update(chunk);
      sha256.update(chunk);
    }
    const artifact = { name, size, sha512: sha512.digest('base64'), sha256: sha256.digest('hex') };
    artifacts.set(name, artifact);
    return artifact;
  }

  for (const name of manifests) {
    const update = yaml.load(fs.readFileSync(path.join(directory, name), 'utf8'));
    if (update.version !== version) throw new Error(`${name}: se esperaba ${version}`);
    if (!Array.isArray(update.files) || !update.files.length) throw new Error(`${name}: faltan archivos`);
    const extension = name === 'latest.yml' ? '.exe' : '.zip';
    if (!update.files.some(file => file.url.endsWith(extension))) {
      throw new Error(`${name}: falta el archivo ${extension} requerido por el actualizador`);
    }
    for (const file of update.files) {
      const artifact = await inspect(file.url);
      if (!file.url.includes(version) || artifact.sha512 !== file.sha512 || artifact.size !== file.size) {
        throw new Error(`${file.url}: versión, tamaño o SHA512 incorrecto`);
      }
      if (file.url.endsWith('.exe')) await inspect(`${file.url}.blockmap`);
    }
    if (update.path) {
      const legacy = await inspect(update.path);
      if (legacy.sha512 !== update.sha512) throw new Error(`${name}: SHA512 legacy incorrecto`);
    }
    await inspect(name);
  }
  if (platform !== 'win' && ![...artifacts.keys()].some(name => name.endsWith('.dmg'))) {
    throw new Error('Falta el instalador DMG de macOS');
  }
  const result = { version, platform, artifacts: [...artifacts.values()] };
  fs.writeFileSync(path.join(directory, `verified-${platform}.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(`Verificados ${result.artifacts.length} archivos de ${platform}, versión ${version}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
