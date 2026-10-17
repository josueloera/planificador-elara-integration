// Physical badge size: 54 x 85 mm. Both formats embed the same 304-dpi image,
// so Word does not reinterpret the application's flex/grid layout or QR SVG.
const W = 648, H = 1020;
const xml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const load = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };

function lines(ctx, text, width) {
  const result = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(word).width > width) {
      if (line) { result.push(line); line = ''; }
      for (const char of word) {
        if (ctx.measureText(line + char).width > width) { result.push(line); line = ''; }
        line += char;
      }
    } else if (line && ctx.measureText(line + ' ' + word).width > width) { result.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) result.push(line);
  return result;
}

export async function badgeImages(root) {
  const cards = [...(root?.querySelectorAll('.gafete-card') || [])];
  if (!cards.length) throw new Error('No hay alumnos para exportar gafetes.');
  const images = [];
  for (const card of cards) {
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#2b6cb0'; c.lineWidth = 4; c.strokeRect(3, 3, W - 6, H - 6);
    c.textAlign = 'center'; c.fillStyle = '#2b6cb0'; c.font = 'bold 26px Arial';
    c.fillText('NUEVA ESCUELA MEXICANA', W / 2, 53);
    c.fillStyle = '#172033'; c.font = 'bold 29px Arial';
    c.fillText(card.dataset.badgeGroup || 'Educación Básica', W / 2, 99, W - 40);
    c.strokeStyle = '#cbd5e1'; c.lineWidth = 2; c.beginPath(); c.moveTo(28, 121); c.lineTo(W - 28, 121); c.stroke();
    const photo = card.querySelector('img');
    c.save(); c.beginPath(); c.arc(W / 2, 265, 114, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#edf2f7'; c.fillRect(W / 2 - 114, 151, 228, 228);
    if (photo) {
      let img;
      try { img = await load(photo.currentSrc || photo.src); }
      catch { throw new Error('No se pudo cargar la foto de ' + card.dataset.badgeName + '. Vuelve a seleccionar su foto.'); }
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      c.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, W / 2 - 114, 151, 228, 228);
    } else {
      c.fillStyle = '#94a3b8'; c.beginPath(); c.arc(W / 2, 235, 43, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(W / 2, 349, 89, 68, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    const name = (card.dataset.badgeName || '').trim();
    if (!name) throw new Error('Hay un gafete sin nombre de alumno.');
    let size = 39, wrapped;
    do { c.font = `bold ${size}px Arial`; wrapped = lines(c, name.toUpperCase(), W - 52); if (wrapped.length * size * 1.18 <= 164) break; size -= 1; } while (size >= 14);
    if (wrapped.length * size * 1.18 > 164) throw new Error('El nombre es demasiado largo para el gafete: ' + name);
    c.fillStyle = '#172033';
    wrapped.forEach((line, i) => c.fillText(line, W / 2, 420 + i * size * 1.18));
    const svg = card.querySelector('svg');
    if (!svg) throw new Error('Falta el código QR de ' + name);
    const qr = svg.cloneNode(true); qr.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const qrImage = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(qr)));
    // White quiet zone around the QR remains at least four modules wide.
    c.fillStyle = 'white'; c.fillRect(144, 594, 360, 360); c.imageSmoothingEnabled = false;
    c.drawImage(qrImage, 174, 624, 300, 300);
    c.fillStyle = '#172033'; c.font = 'bold 28px Arial';
    c.fillText('ID: ' + card.dataset.badgeId, W / 2, 981);
    images.push({ name, data: canvas.toDataURL('image/png') });
  }
  return images;
}

export function badgePdfHtml(images, title) {
  const pages = [];
  for (let i = 0; i < images.length; i += 9) {
    const rows = [];
    for (let r = i; r < Math.min(i + 9, images.length); r += 3) {
      rows.push('<tr>' + Array.from({length:3}, (_, j) => '<td>' + (images[r + j] && r + j < i + 9 ? `<img alt="${xml(images[r + j].name)}" src="${images[r + j].data}">` : '') + '</td>').join('') + '</tr>');
    }
    pages.push('<section><table>' + rows.join('') + '</table></section>');
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${xml(title)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0}section{break-after:page}section:last-child{break-after:auto}table{border-collapse:collapse;table-layout:fixed;width:174mm;margin:0 auto}tr{break-inside:avoid}td{width:58mm;height:89mm;padding:2mm;vertical-align:top}img{display:block;width:54mm;height:85mm}</style></head><body>${pages.join('')}</body></html>`;
}

// Small standards-compliant stored ZIP writer. No runtime dependency or network.
function zip(files) {
  const encoder = new TextEncoder(), local = [], central = []; let offset = 0;
  const bytes = n => new Uint8Array(n);
  const put = (a, pos, n, size = 4) => { for (let i = 0; i < size; i++) a[pos + i] = (n >>> (i * 8)) & 255; };
  for (const [name, value] of Object.entries(files)) {
    const file = typeof value === 'string' ? encoder.encode(value) : value, filename = encoder.encode(name);
    let crc = 0xffffffff;
    for (const b of file) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = bytes(30 + filename.length); put(header, 0, 0x04034b50); put(header, 4, 20, 2); put(header, 14, crc); put(header, 18, file.length); put(header, 22, file.length); put(header, 26, filename.length, 2); header.set(filename, 30);
    const entry = bytes(46 + filename.length); put(entry, 0, 0x02014b50); put(entry, 4, 20, 2); put(entry, 6, 20, 2); put(entry, 16, crc); put(entry, 20, file.length); put(entry, 24, file.length); put(entry, 28, filename.length, 2); put(entry, 42, offset); entry.set(filename, 46);
    local.push(header, file); central.push(entry); offset += header.length + file.length;
  }
  const end = bytes(22); put(end, 0, 0x06054b50); put(end, 8, central.length, 2); put(end, 10, central.length, 2); put(end, 12, central.reduce((n, a) => n + a.length, 0)); put(end, 16, offset);
  return new Blob([...local, ...central, end], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

export function badgeDocx(images) {
  const files = {}, relationships = []; let body = '';
  const para = content => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${content}</w:p>`;
  const cell = (image, index) => {
    let drawing = '';
    if (image) {
      files[`word/media/badge${index}.png`] = Uint8Array.from(atob(image.data.split(',')[1]), ch => ch.charCodeAt(0));
      relationships.push(`<Relationship Id="rId${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/badge${index}.png"/>`);
      drawing = `<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1944000" cy="3060000"/><wp:docPr id="${index}" name="Gafete ${index}" descr="${xml(image.name)}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index}" name="Gafete ${index}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${index}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1944000" cy="3060000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }
    return `<w:tc><w:tcPr><w:tcW w:w="3288" w:type="dxa"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="113" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="113" w:type="dxa"/></w:tcMar></w:tcPr>${para(drawing)}</w:tc>`;
  };
  for (let start = 0; start < images.length; start += 9) {
    if (start) body += '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:br w:type="page"/></w:r></w:p>';
    body += '<w:tbl><w:tblPr><w:tblW w:w="9864" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3288"/><w:gridCol w:w="3288"/><w:gridCol w:w="3288"/></w:tblGrid>';
    for (let row = start; row < Math.min(start + 9, images.length); row += 3) body += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + Array.from({length:3}, (_, j) => cell(images[row + j], row + j + 1)).join('') + '</w:tr>';
    body += '</w:tbl>';
  }
  files['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  files['word/_rels/document.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + relationships.join('') + '</Relationships>';
  files['word/document.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="680" w:right="680" w:bottom="680" w:left="680" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip(files);
}
