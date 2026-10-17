const { BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');

ipcMain.handle('export-document-pdf', async (event, { html, name }) => {
  if (typeof html !== 'string' || html.length > 40000000) throw new Error('Documento no válido o demasiado grande.');
  const owner = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(owner, { title: 'Exportar PDF', defaultPath: String(name || 'Documento').replace(/[<>:"/\\|?*]/g, '-') + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  const view = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true, javascript: false } });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  try {
    await view.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const data = await view.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    await fs.writeFile(result.filePath, data);
    return { saved: true };
  } finally { view.destroy(); }
});
