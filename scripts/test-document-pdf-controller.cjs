const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

test('el PDF de gafetes carga HTML grande desde archivo temporal y lo limpia', async () => {
  let handler, loadedPath, destroyed = false;
  const destination = path.join(os.tmpdir(), `gafetes-${process.pid}.pdf`);
  const electron = {
    BrowserWindow: class {
      constructor() {
        this.loadFile = async file => { loadedPath = file; };
        this.webContents = {
          setWindowOpenHandler() {},
          async printToPDF() {
            assert.match(await fs.readFile(loadedPath, 'utf8'), /^<!doctype html>/);
            return Buffer.from('%PDF-test');
          },
        };
      }
      static fromWebContents() { return {}; }
      destroy() { destroyed = true; }
    },
    dialog: { async showSaveDialog() { return { canceled: false, filePath: destination }; } },
    ipcMain: { handle(_name, callback) { handler = callback; } },
  };
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    return request === 'electron' ? electron : load.call(this, request, parent, isMain);
  };
  try {
    require('../electron/documentExport.cjs');
  } finally {
    Module._load = load;
  }

  const html = '<!doctype html><html><body>' + 'gafete QR y fotografía '.repeat(250000) + '</body></html>';
  assert.ok(html.length > 5_000_000);
  const result = await handler({ sender: {} }, { html, name: 'Gafetes' });
  assert.deepEqual(result, { saved: true });
  assert.ok(loadedPath.endsWith('document.html'));
  await assert.rejects(fs.access(path.dirname(loadedPath)));
  assert.equal((await fs.readFile(destination)).toString(), '%PDF-test');
  assert.equal(destroyed, true);
  await fs.rm(destination, { force: true });
});
