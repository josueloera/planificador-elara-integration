import { Capacitor, registerPlugin } from '@capacitor/core';
import { SQLiteAdapter } from './sqlite-adapter.mjs';
import { installHandlers } from './backend.js';

export const Native = registerPlugin('PlanificadorNative');
export const handlers = new Map();
const listeners = new Map();
export function emit(channel, ...args) { for (const listener of [...(listeners.get(channel) || [])]) listener({}, ...args); }
let invocations = Promise.resolve();
let userDatabase;
const ipcRenderer = {
  invoke(channel, ...args) {
    const operation = invocations.then(async () => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error('Función no disponible: ' + channel);
      const result = await handler({}, ...args);
      await userDatabase.flush();
      return result;
    });
    invocations = operation.catch(() => {});
    return operation;
  },
  on(channel, listener) { if (!listeners.has(channel)) listeners.set(channel, new Set()); listeners.get(channel).add(listener); return this; },
  removeListener(channel, listener) { listeners.get(channel)?.delete(listener); return this; },
  removeAllListeners(channel) { listeners.delete(channel); return this; },
  send(channel, ...args) { this.invoke(channel, ...args).catch(error => alert(error.message)); }
};

export async function initializeAndroid() {
  if (!Capacitor.isNativePlatform() && !window.__ANDROID_TEST_NATIVE__) throw new Error('Abre esta versión desde la app de Android.');
  const native = window.__ANDROID_TEST_NATIVE__ || Native;
  await native.initialize();
  userDatabase = new SQLiteAdapter(native, 'user');
  const catalog = new SQLiteAdapter(native, 'catalog');
  const ipcMain = { handle(channel, callback) { if (handlers.has(channel)) throw new Error('Canal duplicado: ' + channel); handlers.set(channel, callback); } };
  const webContents = { isDestroyed: () => false, send: emit };
  const browserWindow = { isDestroyed: () => false, webContents, show() {}, focus() {} };
  const BrowserWindow = { getAllWindows: () => [browserWindow], getFocusedWindow: () => browserWindow };
  installHandlers({ db: userDatabase, universalDb: catalog, ipcMain, BrowserWindow });
  ipcMain.handle('app-focus', () => true);
  ipcMain.handle('get-license-status', () => native.license({ action: 'status' }));
  ipcMain.handle('get-license-proof', () => native.license({ action: 'proof' }));
  ipcMain.handle('activate-license', (_, key) => native.license({ action: 'activate', key }));
  ipcMain.handle('start-trial', () => native.license({ action: 'trial' }));
  ipcMain.handle('elara-speak', async (_, text) => { await native.speak({ text }); return null; });
  ipcMain.handle('generate-ai-material', (_, request) => native.generateAi(request));
  ipcMain.handle('get-local-ip', () => '127.0.0.1');
  ipcMain.handle('get-local-ips', () => []);
  ipcMain.handle('get-ws-info', () => ({ ip: '127.0.0.1', port: 0, ips: [], standalone: true }));
  ipcMain.handle('open-license-file-dialog', () => native.openLicenseFile());
  ipcMain.handle('open-base64-image', (_, dataUrl) => native.saveDocument({ base64: dataUrl.split(',')[1], mime: 'image/png', name: 'material-elara.png' }));
  ipcMain.handle('deactivate-license-api', async () => { await native.license({ action: 'deactivate' }); return true; });
  ipcMain.handle('export-backup', () => native.exportBackup());
  ipcMain.handle('import-backup', () => native.importBackup());
  await userDatabase.flush();
  await catalog.flush();
  window.planificadorAndroid = { ipcRenderer, native };
  window.require = name => { if (name === 'electron') return { ipcRenderer }; throw new Error('Módulo exclusivo del escritorio: ' + name); };
  window.print = () => native.printPage().catch(error => alert(error.message));
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^(blob:|data:)/.test(this.href)) {
      const name = this.download;
      fetch(this.href).then(response => response.blob()).then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve({ base64: String(reader.result).split(',')[1], mime: blob.type || 'application/octet-stream', name }); reader.onerror = reject; reader.readAsDataURL(blob);
      })).then(data => native.saveDocument(data)).catch(error => alert('No se pudo guardar: ' + error.message));
      return;
    }
    originalClick.call(this);
  };
}
