import React,{useState} from 'react';
import docxSource from './programa-docx.js?raw';
import {exportDocument,saveDocument} from '../utils/documentExport';
let library;
function docx(){if(!library){const module={exports:{}};new Function('module','exports',docxSource)(module,module.exports);library=module.exports;}return library;}
export async function elaraDocx(root,title){
 const d=docx();const paragraph=(text,options={})=>new d.Paragraph({children:String(text||'').split('\n').map((line,i)=>new d.TextRun({text:line,break:i?1:0})),spacing:{after:140},...options});
 const blocks=[];let articles=0;
 async function walk(node){
  if(node.nodeType!==1)return;const tag=node.tagName;
  if(tag==='ARTICLE'&&articles++>0)blocks.push(new d.Paragraph({children:[new d.PageBreak()]}));
  if(/^H[123]$/.test(tag)){blocks.push(paragraph(node.innerText,{heading:tag==='H3'?d.HeadingLevel.HEADING_2:d.HeadingLevel.HEADING_1,keepNext:true}));return;}
  if(['P','FIGCAPTION'].includes(tag)){blocks.push(paragraph(node.innerText));return;}
  if(tag==='TABLE'){
   blocks.push(new d.Table({width:{size:100,type:d.WidthType.PERCENTAGE},rows:[...node.rows].map((row,index)=>new d.TableRow({tableHeader:index===0,cantSplit:true,children:[...row.cells].map(cell=>new d.TableCell({shading:index===0?{fill:'E9EFFA'}:undefined,margins:{top:90,bottom:90,left:90,right:90},children:[paragraph(cell.innerText)]}))}))}));blocks.push(paragraph(''));return;
  }
  if(tag==='IMG'){
   await node.decode();const canvas=document.createElement('canvas');canvas.width=node.naturalWidth;canvas.height=node.naturalHeight;canvas.getContext('2d').drawImage(node,0,0);const data=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));const width=Math.min(node.width||240,500),height=width*node.naturalHeight/node.naturalWidth;
   blocks.push(new d.Paragraph({children:[new d.ImageRun({data,transformation:{width,height}})]}));return;
  }
  for(const child of node.children)await walk(child);
 }
 await walk(root);
 const document=new d.Document({creator:'Elara',title,styles:{default:{document:{run:{font:'Arial',size:22,color:'172033'}}},paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:32,bold:true,color:'203F7A'},paragraph:{spacing:{before:240,after:160},keepNext:true}},{id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:25,bold:true,color:'3655A2'},paragraph:{spacing:{before:200,after:100},keepNext:true}}]},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:850,right:850,bottom:850,left:850}}},headers:{default:new d.Header({children:[paragraph('ELARA · '+title,{alignment:d.AlignmentType.RIGHT})]})},footers:{default:new d.Footer({children:[new d.Paragraph({alignment:d.AlignmentType.RIGHT,children:[new d.TextRun('Página '),new d.TextRun({children:[d.PageNumber.CURRENT]})]})]})},children:blocks}]});
 return d.Packer.toBlob(document);
}
export default function ElaraExport({title,selector}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async(format)=>{setBusy(true);setError('');try{const root=document.querySelector(selector);if(!root)throw Error('No hay un reporte para exportar.');if(format==='pdf')await exportDocument(root,title,'pdf');else await saveDocument(await elaraDocx(root,title),title.replace(/[<>:"/\\|?*]/g,'-')+'.docx');}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <div className="no-print"><button disabled={busy} onClick={()=>run('pdf')}>Exportar PDF</button><button disabled={busy} onClick={()=>run('word')}>Exportar Word</button>{error&&<p role="alert">{error}</p>}</div>;
}
