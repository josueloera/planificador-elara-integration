const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
for (const platform of ['win32', 'darwin']) {
  test(`${platform}: pairing reports fallback port and forwards mobile scans`, () => {
    const servers = [], sent = [], handlers = new Map(), timers = [];
    class Server extends EventEmitter {
      constructor(options) { super(); this.options = options; this.clients = new Set(); servers.push(this); }
    }
    class Window {
      constructor() { this.webContents = { send: (...args) => sent.push(args) }; }
      maximize() {} show() {} focus() {} isDestroyed() { return false; }
    }
    const context = vm.createContext({
      path, __dirname: path.join(root, 'electron'),
      process: { platform }, BrowserWindow: Window, WebSocketServer: Server,
      console: { log() {}, error() {} }, setTimeout: fn => timers.push(fn),
      setInterval: () => 1, clearInterval() {},
      getLocalIp: () => '192.168.1.42', getLocalIps: () => [{ name: 'Wi-Fi', ip: '192.168.1.42' }],
      ipcMain: { handle: (name, fn) => handlers.set(name, fn) },
    });
    const start = source.indexOf('let activeWsPort');
    const create = source.indexOf('function createWindow()');
    const serverEnd = source.indexOf('  startWsServer(3000);', create) + '  startWsServer(3000);'.length;
    // Keep the original scope of the declaration: this fails if it is local to createWindow.
    const declaration = start < create ? source.slice(start, create) : '';
    const handler = source.split('\n').find(line => line.includes("ipcMain.handle('get-ws-info'"));
    vm.runInContext(declaration + source.slice(create, serverEnd) + '\n}\ncreateWindow();\n' + handler, context);
    servers[0].emit('error', { code: 'EADDRINUSE', message: 'busy' });
    timers.shift()();
    assert.equal(servers[1].options.port, 3001);
    servers[1].emit('listening');
    return Promise.resolve(handlers.get('get-ws-info')()).then(info => {
      assert.equal(info.ip, '192.168.1.42');
      assert.equal(info.port, 3001);
      const mobile = new EventEmitter();
      servers[1].emit('connection', mobile);
      mobile.emit('message', Buffer.from('ALU-42'));
      assert.deepEqual(sent, [['qr-scanned', 'ALU-42']]);
    });
  });
}
