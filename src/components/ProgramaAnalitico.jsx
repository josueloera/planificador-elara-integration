import { useEffect, useRef, useState } from 'react';
import template from './programa-analitico.html?raw';
import tailwind from './programa-tailwind.js?raw';
import docx from './programa-docx.js?raw';
import { claveDocente, leerDocumento, guardarDocumento } from '../seguimientoDocente';
import { saveDocument } from '../utils/documentExport';
import './SeguimientoDocente.css';
const scriptJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
export function bancoSecundaria(rows) {
  const bank = {'Lenguajes':[], 'Saberes y Pensamiento Científico':[], 'Ética, Naturaleza y Sociedades':[], 'De lo Humano y lo Comunitario':[]};
  const aliases = {LEN:'Lenguajes', SyPC:'Saberes y Pensamiento Científico', ENyS:'Ética, Naturaleza y Sociedades', DHyC:'De lo Humano y lo Comunitario'};
  for (const row of rows) {
    const campo = aliases[row.campo] || Object.keys(bank).find(k => k.toLowerCase() === String(row.campo).toLowerCase());
    if (!campo) throw new Error(`Campo formativo desconocido: ${row.campo}`);
    const contenido = `${row.disciplina}: ${row.contenido}`;
    let entry = bank[campo].find(x => x.contenido === contenido);
    if (!entry) { entry = {contenido, pda:{}}; bank[campo].push(entry); }
    entry.pda[row.grado] = [entry.pda[row.grado], row.pda].filter(Boolean).join('\n• ');
  }
  return bank;
}
export default function ProgramaAnalitico({ ipc, contexto, variante, grupo, grado, ciclo, onVolver }) {
  const frame = useRef(null), queue = useRef(Promise.resolve());
  const [html, setHtml] = useState(''), [error,setError] = useState(''), [status,setStatus] = useState('Cargando programa…'), [busy,setBusy] = useState(false);
  const key = claveDocente('programa-analitico', contexto);
  const persist = data => {
    setStatus('Guardando…');
    const next = queue.current.catch(()=>{}).then(()=>guardarDocumento(ipc,key,data));
    queue.current = next;
    next.then(()=>{setStatus('Guardado');setError('');}, e=>{setError(e.message);setStatus('Cambios pendientes de guardar');});
    return next;
  };
  useEffect(() => {
    let active = true;
    if (!contexto) {setError('Selecciona un grupo.');return;}
    (async () => {
      const store = await leerDocumento(ipc,key,{});
      store.programa_analitico_grado_v5 = String(grado);
      let page = template;
      if (variante === 'secundaria') {
        const disciplinas = await ipc.invoke('get-disciplinas');
        const rows = (await Promise.all(disciplinas.map(async d => (await ipc.invoke('get-pdas-disciplina',d.id,grado)).map(p=>({...p,disciplina:d.nombre}))))).flat();
        if (!rows.length) throw new Error('No se encontraron PDA de Secundaria para este grado.');
        page = page.replace(/const BANCO_CURRICULAR = .*?;\r?\n/, () => `const BANCO_CURRICULAR = ${scriptJson(bancoSecundaria(rows))};\n`)
          .replace(/Primaria/g,'Secundaria').replace('Fases 3, 4 y 5 • 1.º a 6.º Grado','Fase 6 • 1.º a 3.º Grado')
          .replace(/<option value="[456]">Fase [^<]+<\/option>/g,'').replace(/Fase [345] -/g,'Fase 6 -');
      }
      const bridge = `<script>window.__nivel=${scriptJson(variante)};window.__grado=${scriptJson(grado)};const hostStore=${scriptJson(store)};const hadSavedProjects=Boolean(hostStore.programa_analitico_proyectos_v5);const hostStorage={getItem:k=>hostStore[k]??null,setItem:(k,v)=>{hostStore[k]=String(v)}};
        window.__snapshot=()=>{guardarProgresoLocal(false);hostStore.formulario=JSON.stringify(Object.fromEntries([...document.querySelectorAll('[id^="escuela_"],[id^="diag_"]')].filter(el=>'value' in el).map(el=>[el.id,el.value])));return hostStore;};
        let saveTimer;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>parent.postMessage({type:'programa-save',data:window.__snapshot()},'*'),350)};
        document.addEventListener('input',scheduleSave);document.addEventListener('change',scheduleSave);document.addEventListener('click',scheduleSave);
        window.addEventListener('DOMContentLoaded',()=>{const fields=JSON.parse(hostStore.formulario||'{}');for(const [id,value] of Object.entries(fields)){const el=document.getElementById(id);if(el)el.value=value;}
          const g=document.getElementById('escuela_grado');g.value=${scriptJson(String(grado))};g.disabled=true;gradoActual=g.value;
          if(!hostStore.formulario){document.getElementById('escuela_grupo').value=${scriptJson(grupo.seccion||'')};document.getElementById('escuela_nombre').value=${scriptJson(grupo.escuela||ciclo.nombreEscuela||'')};document.getElementById('escuela_ciclo').value=${scriptJson(grupo.ciclo_escolar||ciclo.fechaInicioStr.slice(0,4)+'-'+(Number(ciclo.fechaInicioStr.slice(0,4))+1))};}
          if(!hadSavedProjects){proyectosData=[];renderizarProyectosCards();actualizarBadgesConteo();guardarProgresoLocal(false);}
        });<\/script>`;
      page = page.replace('<!-- HOST_BRIDGE -->',bridge)
        .replace('<!-- TAILWIND_LOCAL -->',()=>`<script>${tailwind.replace(/<\/script/gi,'<\\/script')}<\/script>`)
        .replace('<!-- DOCX_LOCAL -->',()=>`<script>${docx.replace(/<\/script/gi,'<\\/script')}<\/script>`);
      if(active) {setHtml(page);setStatus('Listo');}
    })().catch(e=>{if(active){setError(e.message);setStatus('No se pudo cargar');}});
    return ()=>{active=false;};
  },[ipc,key,variante,grado]);
  useEffect(()=>{
    const receive = event => {
      if(event.source!==frame.current?.contentWindow) return;
      if(event.data?.type==='programa-save') persist(event.data.data).catch(()=>{});
      if(event.data?.type==='programa-download') saveDocument(event.data.blob,event.data.name).catch(e=>setError(e.message));
    };
    window.addEventListener('message',receive);return ()=>window.removeEventListener('message',receive);
  },[key]);
  const leave = async()=>{setBusy(true);try{if(frame.current?.contentWindow?.__snapshot)await persist(frame.current.contentWindow.__snapshot());onVolver();}catch{}finally{setBusy(false);}};
  return <div className="programa-analitico"><header><strong>Programa analítico · {grado}º {variante === 'primaria' ? 'Primaria' : 'Secundaria'} · {grupo?.seccion}</strong><span role="status">{status}</span><button disabled={busy} onClick={leave}>Guardar y volver al menú</button>{error&&<span role="alert">{error}</span>}</header>
    {html&&<iframe ref={frame} title="Programa analítico" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-modals allow-downloads"/>}</div>;
}
