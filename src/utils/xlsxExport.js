import { zip } from './badgeExport.js';
const NS = 'urn:schemas-microsoft-com:office:spreadsheet';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
const attr = (node, name) => node.getAttributeNS(NS, name) || node.getAttribute('ss:' + name);
const children = (node, name) => Array.from(node?.childNodes || []).filter(n => n.localName === name);
function column(n) { let s=''; for (;n>0;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }

// Convert the existing styled SpreadsheetML reports to an actual Open XML workbook.
export function spreadsheetXmlToXlsx(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('No se pudo generar la tabla de Excel.');
  const sheets = Array.from(doc.getElementsByTagNameNS(NS,'Worksheet'));
  if (!sheets.length) throw new Error('El reporte no contiene hojas de cálculo.');
  const files={}, names=new Set(), workbook=[], relationships=[], overrides=[], imageExtensions=new Set();
  let imageNo=0;
  const styles=Array.from(doc.getElementsByTagNameNS(NS,'Style'));
  const styleIds=new Map(styles.map((s,i)=>[attr(s,'ID'),i+1]));
  const fonts=['<font><sz val="11"/><name val="Calibri"/></font>'];
  const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'];
  const xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  for (const s of styles) {
    const f=children(s,'Font')[0], fill=children(s,'Interior')[0], a=children(s,'Alignment')[0];
    fonts.push(`<font><sz val="${Number(f&&attr(f,'Size'))||11}"/><name val="${esc(f&&attr(f,'FontName')||'Calibri')}"/>${f&&attr(f,'Bold')==='1'?'<b/>':''}${f&&attr(f,'Color')?`<color rgb="FF${esc(attr(f,'Color').replace('#',''))}"/>`:''}</font>`);
    let fillId=0;
    if(fill&&attr(fill,'Color')) {fillId=fills.length;fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${esc(attr(fill,'Color').replace('#',''))}"/><bgColor indexed="64"/></patternFill></fill>`);}
    const horizontal=a&&attr(a,'Horizontal')?.toLowerCase();
    xfs.push(`<xf numFmtId="0" fontId="${fonts.length-1}" fillId="${fillId}" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"${['left','right','center','justify'].includes(horizontal)?` horizontal="${horizontal}"`:''}/></xf>`);
  }
  files['xl/styles.xml']=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs></styleSheet>`;
  sheets.forEach((sheet,i)=>{
    let name=(attr(sheet,'Name')||`Hoja ${i+1}`).replace(/[\\/?*\[\]:]/g,' ').slice(0,31), base=name, suffix=1;
    while(names.has(name.toLowerCase())) {const tail=` (${suffix++})`;name=base.slice(0,31-tail.length)+tail;}
    names.add(name.toLowerCase());
    const table=children(sheet,'Table')[0];
    const merges=[], rows=[], pictures=[], rowHeights=new Map();let r=0;
    for(const row of children(table,'Row')) {
      r=Number(attr(row,'Index'))||r+1;let c=0;
      const cells=[];
      for(const cell of children(row,'Cell')) {
        c=Number(attr(cell,'Index'))||c+1;
        const data=children(cell,'Data')[0], value=data?.textContent||'', ref=column(c)+r;
        const style=styleIds.get(attr(cell,'StyleID'))||0;
        const photo=cell.getAttribute('elara:Photo');
        const match=photo&&photo.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i);
        if(match){
          const ext=match[1].toLowerCase()==='png'?'png':'jpg', id=++imageNo;
          files[`xl/media/image${id}.${ext}`]=Uint8Array.from(atob(match[2]),ch=>ch.charCodeAt(0));
          imageExtensions.add(ext); pictures.push({id,ext,col:c-1,row:r-1}); rowHeights.set(r,90);
        }
        if(data&&attr(data,'Type')==='Number'&&value.trim()&&Number.isFinite(Number(value))) cells.push(`<c r="${ref}" s="${style}"><v>${Number(value)}</v></c>`);
        else cells.push(`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`);
        const across=Number(attr(cell,'MergeAcross'))||0, down=Number(attr(cell,'MergeDown'))||0;
        if(across||down) merges.push(`<mergeCell ref="${ref}:${column(c+across)}${r+down}"/>`);
        c+=across;
      }
      const height=Number(attr(row,'Height'))||rowHeights.get(r);
      rows.push(`<row r="${r}"${height?` ht="${height}" customHeight="1"`:''}>${cells.join('')}</row>`);
    }
    let col=0;
    const cols=children(table,'Column').map(c=>{const min=Number(attr(c,'Index'))||col+1;col=min+(Number(attr(c,'Span'))||0);return `<col min="${min}" max="${col}" width="${Math.max(5,(Number(attr(c,'Width'))||90)/5.25)}" customWidth="1"/>`;});
    const drawingTag=pictures.length?'<drawing r:id="rId1"/>':'';
    files[`xl/worksheets/sheet${i+1}.xml`]=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${cols.length?`<cols>${cols.join('')}</cols>`:''}<sheetData>${rows.join('')}</sheetData>${merges.length?`<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>`:''}${drawingTag}</worksheet>`;
    if(pictures.length){
      const anchors=pictures.map((pic,j)=>`<xdr:oneCellAnchor><xdr:from><xdr:col>${pic.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${pic.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="914400" cy="1097280"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${j+1}" name="Fotografía ${j+1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${j+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="1097280"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`).join('');
      files[`xl/drawings/drawing${i+1}.xml`]=`<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`;
      files[`xl/drawings/_rels/drawing${i+1}.xml.rels`]=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pictures.map((pic,j)=>`<Relationship Id="rId${j+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${pic.id}.${pic.ext}"/>`).join('')}</Relationships>`;
      files[`xl/worksheets/_rels/sheet${i+1}.xml.rels`]=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i+1}.xml"/></Relationships>`;
      overrides.push(`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
    }
    workbook.push(`<sheet name="${esc(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`);
    relationships.push(`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`);
    overrides.push(`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
  });
  files['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbook.join('')}</sheets></workbook>`;
  files['xl/_rels/workbook.xml.rels']=`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  files['_rels/.rels']='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="workbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const imageTypes=[...imageExtensions].map(ext=>`<Default Extension="${ext}" ContentType="image/${ext==='jpg'?'jpeg':'png'}"/>`).join('');
  files['[Content_Types].xml']=`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageTypes}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides.join('')}</Types>`;
  return zip(files,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
