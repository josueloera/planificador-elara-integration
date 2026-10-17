const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const filename = name => String(name || 'Documento').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 120);

export async function saveDocument(blob, name) {
  if (window.planificadorAndroid?.native) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob);
    });
    return window.planificadorAndroid.native.saveDocument({ base64, name, mime: blob.type });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function svgImage(node) {
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(node));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(300, node.getBoundingClientRect().width * 3);
  canvas.height = Math.max(300, node.getBoundingClientRect().height * 3);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// Snapshot the selected document, including current form values and embedded QR codes.
export async function documentHtml(root, title) {
  if (!root) throw new Error('No hay un documento visible para exportar.');
  const copy = root.cloneNode(true);
  const originals = [root, ...root.querySelectorAll('*')];
  const clones = [copy, ...copy.querySelectorAll('*')];
  for (let i = 0; i < originals.length; i++) {
    const src = originals[i], dst = clones[i];
    if (src.matches('script,style,button,nav,video,audio,.no-print,[data-export-controls],input[type=file]')) { dst.remove(); continue; }
    const css = getComputedStyle(src);
    if (css.display === 'none' || css.visibility === 'hidden') { dst.remove(); continue; }
    dst.removeAttribute('class'); dst.removeAttribute('id');
    for (const attr of [...dst.attributes]) if (/^on/i.test(attr.name)) dst.removeAttribute(attr.name);
    dst.removeAttribute('style');
    for (const key of ['color','background-color','font-size','font-weight','font-style','text-align','white-space','border','padding','margin-bottom']) dst.style.setProperty(key, css.getPropertyValue(key));
    dst.style.color = '#172033';
    if (src.matches('input,textarea,select')) {
      const text = document.createElement('span');
      text.textContent = src.type === 'checkbox' ? (src.checked ? 'Sí' : 'No') : src.tagName === 'SELECT' ? src.selectedOptions[0]?.textContent || '' : src.value;
      text.style.whiteSpace = 'pre-wrap'; dst.replaceWith(text);
    } else if (src.tagName.toLowerCase() === 'svg') {
      const img = document.createElement('img'); img.src = await svgImage(src); img.width = src.getBoundingClientRect().width || 110; img.height = src.getBoundingClientRect().height || 110; dst.replaceWith(img);
    } else if (src.matches('img')) {
      dst.src = src.currentSrc || src.src; dst.style.maxWidth = '100%'; dst.width = Math.min(src.getBoundingClientRect().width || 120, 600);
    } else if (src.matches('.gafete-card')) {
      dst.style.cssText += ';display:inline-block;vertical-align:top;width:280px;margin:8px;padding:16px;border:2px solid #2b6cb0;break-inside:avoid;';
    }
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:11pt Arial;color:#172033}h1{font-size:16pt}table{border-collapse:collapse;width:100%;table-layout:auto}td,th{border:1px solid #aab4c2;padding:6px;overflow-wrap:anywhere}tr,img{break-inside:avoid}img{max-width:100%}@page{size:A4;margin:12mm}</style></head><body><h1>${escape(title)}</h1>${copy.outerHTML}</body></html>`;
}

export async function exportHtmlPdf(html, title = 'Documento') {
  if (window.planificadorAndroid?.native) return window.planificadorAndroid.native.printDocument({ html, name: filename(title) });
  if (window.require) return window.require('electron').ipcRenderer.invoke('export-document-pdf', { html, name: filename(title) });
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Permite la ventana para guardar el PDF.');
  popup.document.write(html); popup.document.close();
  await Promise.all([...popup.document.images].map(img => img.decode().catch(() => {})));
  popup.focus(); popup.print();
}

export async function exportDocument(root, title, format) {
  if (format === 'excel') {
    if (!root) throw new Error('No hay un documento para exportar.');
    const tables = [...root.querySelectorAll('table')].filter(t => t.getClientRects().length);
    if (root.matches('table')) tables.unshift(root);
    if (!tables.length) throw new Error('Este documento no contiene tablas para Excel.');
    const sheets = tables.map((table, i) => `<Worksheet ss:Name="Tabla ${i + 1}"><Table>${[...table.rows].map(row => `<Row>${[...row.cells].map(cell => {
      const controls = [...cell.querySelectorAll('input,textarea,select')];
      const text = controls.length ? controls.map(c => c.tagName === 'SELECT' ? c.selectedOptions[0]?.textContent : c.value).join(' ') : cell.innerText;
      const type = /^-?\d+(\.\d+)?$/.test(text.trim()) ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${type}">${escape(text)}</Data></Cell>`;
    }).join('')}</Row>`).join('')}</Table></Worksheet>`).join('');
    return saveDocument(new Blob([`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets}</Workbook>`], { type: 'application/vnd.ms-excel' }), filename(title) + '.xls');
  }
  const html = await documentHtml(root, title);
  if (format === 'pdf') return exportHtmlPdf(html, title);
  return saveDocument(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }), filename(title) + '.doc');
}
