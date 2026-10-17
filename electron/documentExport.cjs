const { BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

ipcMain.handle('export-document-pdf', async (event, { html, name }) => {
  if (typeof html !== 'string' || html.length > 40000000) throw new Error('Documento no válido o demasiado grande.');
  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(owner, { title: 'Exportar PDF', defaultPath: String(name || 'Documento').replace(/[<>:"/\\|?*]/g, '-') + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  const view = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true, javascript: false } });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let tempDir;
  try {
    // Loading a full badge sheet as a data: URL exceeds Chromium's URL limits
    // once photos and QR images are embedded. Use a temporary local HTML file.
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'planificador-pdf-'));
    const htmlPath = path.join(tempDir, 'document.html');
    await fs.writeFile(htmlPath, html, 'utf8');
    await view.loadFile(htmlPath);
    const data = await view.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    await fs.writeFile(result.filePath, data);
    return { saved: true };
  } finally {
    view.destroy();
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  }
});
