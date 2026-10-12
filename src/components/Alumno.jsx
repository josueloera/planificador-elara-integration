import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIAS, CAMPOS_PERFIL, filtrarAlumnos, construirCalificaciones, crearTablaCalificaciones, htmlPerfil, nombreSeguro, leerArchivo, bytesBase64, crearZip, guardarArchivo } from '../alumnoUtils.js';
import './Alumno.css';
import AlumnoSeguimiento from './AlumnoSeguimiento.jsx';
import { prepararFotoAlumno } from '../alumnoFoto.js';

const TABS = [['perfil','Perfil'],['calificaciones','Calificaciones'],['expediente','Expediente'],['seguimiento','Seguimiento']];
const fecha = value => value ? String(value).slice(0,10) : '—';
const peso = bytes => bytes >= 1048576 ? `${(bytes/1048576).toFixed(1)} MB` : `${Math.max(1,Math.ceil(bytes/1024))} KB`;

export default function Alumno({ ipcRenderer, variante = 'primaria', configCiclo, grupoActual, onVolver }) {
  const [lista,setLista] = useState([]), [busqueda,setBusqueda] = useState(''), [grado,setGrado] = useState('');
  const [seleccion,setSeleccion] = useState(null), [detalle,setDetalle] = useState(null), [perfil,setPerfil] = useState({});
  const [calificaciones,setCalificaciones] = useState([]), [tab,setTab] = useState('perfil');
  const [cargando,setCargando] = useState(true), [cargandoDetalle,setCargandoDetalle] = useState(false), [ocupado,setOcupado] = useState(false);
  const [error,setError] = useState(''), [aviso,setAviso] = useState(''), [categoria,setCategoria] = useState(CATEGORIAS[0]);
  const [editado,setEditado] = useState(false), [automaticas,setAutomaticas] = useState({});
  const request = useRef(0), alive = useRef(true), fileInput = useRef(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
  useEffect(()=>{
    let active=true;setCargando(true);setLista([]);
    async function load() {
      try {
        if(!ipcRenderer)throw new Error('Abre ALUMNO desde la aplicación instalada.');
        const [alumnos,disciplinas] = await Promise.all([ipcRenderer.invoke('alumno-buscar',{grupo_id:grupoActual?.id}),ipcRenderer.invoke('get-disciplinas')]);
        const names = new Map((disciplinas || []).map(d=>[Number(d.id),d.nombre]));
        if(active)setLista(alumnos.map(a=>({...a,grado:variante==='primaria' && Number(a.grupo_id)===Number(grupoActual?.id)?grupoActual?.grado:a.grado,seccion:variante==='primaria' && Number(a.grupo_id)===Number(grupoActual?.id)?grupoActual?.seccion || '':a.seccion,materia:variante==='primaria'?'Primaria':names.get(Number(a.disciplina_id)) || `Materia ${a.disciplina_id || ''}`})));
      } catch(e){if(active)setError(e.message);} finally {if(active)setCargando(false);}
    }
    load();return()=>{active=false;};
  },[ipcRenderer,variante,grupoActual?.id,grupoActual?.grado,grupoActual?.seccion]);
  const encontrados = useMemo(()=>filtrarAlumnos(lista,busqueda,grado),[lista,busqueda,grado]);
  const grados = useMemo(()=>[...new Set(lista.map(a=>a.grado).filter(Boolean))].sort((a,b)=>a-b),[lista]);
  const tablaCalificaciones = useMemo(() => crearTablaCalificaciones(calificaciones), [calificaciones]);
  async function seleccionar(alumno) {
    if(ocupado)return;
    if(editado && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y abrir otro alumno?'))return;
    const current=++request.current;setSeleccion(alumno);setDetalle(null);setPerfil({});setCalificaciones([]);setAutomaticas({});setEditado(false);setCargandoDetalle(true);setError('');setAviso('');setTab('perfil');
    try {
      const data = await ipcRenderer.invoke('alumno-get-detalle',alumno.id);
      const periodos=configCiclo?.periodos || {};
      const auto=await Promise.all(Object.entries(periodos).map(async([id,p])=>[id,data.alumno.grupo_id ? await ipcRenderer.invoke('get-evaluacion-automatica',data.alumno.grupo_id,{inicio:p.inicio,fin:p.fin}) : null]));
      if(current!==request.current || !alive.current)return;
      data.alumno={...data.alumno,...alumno};setDetalle(data);setPerfil(data.perfil);
      setAutomaticas(Object.fromEntries(auto));
      setCalificaciones(construirCalificaciones(data,Object.fromEntries(auto),periodos,variante,alumno.materia));
    } catch(e){if(current===request.current && alive.current)setError(e.message);} finally {if(current===request.current && alive.current)setCargandoDetalle(false);}
  }
  async function ejecutar(work) {
    if(ocupado)return;setOcupado(true);setError('');setAviso('');
    try {await work();}catch(e){if(alive.current)setError(e.message || 'No se pudo completar la operación.');}finally{if(alive.current)setOcupado(false);}
  }
  const cambiar = (field,value)=>{setPerfil(prev=>({...prev,[field]:value}));setEditado(true);};
  async function guardarPerfil(event) {
    event.preventDefault();await ejecutar(async()=>{
      const saved=await ipcRenderer.invoke('alumno-save-perfil',{...perfil,alumno_id:seleccion.id});
      if(!alive.current)return;setPerfil(saved);setDetalle(prev=>({...prev,perfil:saved}));setEditado(false);setAviso('Perfil guardado.');
    });
  }
  async function foto(event) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    await ejecutar(async()=>{
      cambiar('foto_url',await prepararFotoAlumno(file));setAviso('Foto preparada. Guarda el perfil para conservarla.');
    });
  }
  async function cargarArchivos(event) {
    const files=[...(event.target.files || [])];event.target.value='';if(!files.length)return;
    await ejecutar(async()=>{
      let count=0;
      try {
        for(const file of files){
          if(!file.size || file.size>20*1024*1024)throw new Error(`${file.name}: selecciona un archivo de entre 1 byte y 20 MB. Se guardaron ${count} de ${files.length}.`);
          const data=await leerArchivo(file);
          await ipcRenderer.invoke('alumno-add-documento',seleccion.id,{categoria,nombre:file.name,mime:file.type || 'application/octet-stream',tamano:file.size,contenido:data.split(',')[1]});count++;
        }
        setAviso(`${count} archivo(s) guardado(s) en el expediente.`);
      } finally {
        const archivos=await ipcRenderer.invoke('alumno-list-expediente',seleccion.id);
        if(alive.current)setDetalle(prev=>({...prev,archivos}));
      }
    });
  }
  async function descargar(archivo) {
    await ejecutar(async()=>{const file=await ipcRenderer.invoke('alumno-get-documento',seleccion.id,archivo.id);const result=await guardarArchivo(new Blob([bytesBase64(file.contenido)],{type:file.mime}),nombreSeguro(file.nombre));if(!result?.cancelled)setAviso('Archivo exportado.');});
  }
  async function eliminar(archivo) {
    if(!window.confirm(`¿Eliminar «${archivo.nombre}» del expediente de ${seleccion.nombre}?`))return;
    await ejecutar(async()=>{await ipcRenderer.invoke('alumno-delete-documento',seleccion.id,archivo.id);const archivos=await ipcRenderer.invoke('alumno-list-expediente',seleccion.id);setDetalle(prev=>({...prev,archivos}));setAviso('Archivo eliminado.');});
  }
  const datosReporte = detalle ? {...detalle,perfil,calificaciones,escuela:configCiclo} : null;
  async function exportar() {
    if(editado){setError('Guarda los cambios del perfil antes de exportar.');return;}
    await ejecutar(async()=>{
      const entries=[{name:'Perfil.html',data:htmlPerfil(datosReporte)},{name:'Perfil.json',data:JSON.stringify(datosReporte,null,2)}];
      let total=entries.reduce((sum,e)=>sum+new TextEncoder().encode(e.data).length,0);
      for(const file of detalle.archivos){
        total+=file.tamano;
        if(total>200*1024*1024)throw new Error('El expediente supera 200 MB. Exporta sus archivos por separado para evitar agotar la memoria.');
        const stored=await ipcRenderer.invoke('alumno-get-documento',seleccion.id,file.id);
        entries.push({name:`Documentos/${nombreSeguro(file.categoria)}/${file.id}-${nombreSeguro(file.nombre)}`,data:bytesBase64(stored.contenido)});
      }
      const result=await guardarArchivo(crearZip(entries),`Expediente-${nombreSeguro(seleccion.nombre)}-${seleccion.id}.zip`);if(!result?.cancelled)setAviso('Expediente exportado con ficha y documentos.');
    });
  }
  function imprimir(){if(editado){setError('Guarda los cambios del perfil antes de imprimir.');return;}window.print();}
  function volver(){if(ocupado)return;if(!editado || window.confirm('Hay cambios sin guardar. ¿Salir sin guardarlos?'))onVolver();}
  return <main className={`alumno-screen alumno-${variante}`}>
    <header className="alumno-header no-print"><div><p className="alumno-eyebrow">PLANIFICADOR DOCENTE</p><h1>ALUMNO</h1><p>Perfil, calificaciones y expediente escolar</p></div><button onClick={volver} disabled={ocupado}>← Menú principal</button></header>
    <div className="alumno-layout no-print">
      <aside className="alumno-search" aria-label="Buscar alumno"><h2>Buscar alumno</h2><label htmlFor="alumno-search">Nombre del alumno</label><input id="alumno-search" type="search" placeholder="Escribe un nombre o apellido…" value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        {variante==='secundaria' && <><label htmlFor="alumno-grade">Grado</label><select id="alumno-grade" value={grado} onChange={e=>setGrado(e.target.value)}><option value="">Todos los grados</option>{grados.map(g=><option key={g} value={g}>{g}º de secundaria</option>)}</select></>}
        <p className="alumno-muted" aria-live="polite">{cargando?'Cargando alumnos…':`${encontrados.length} alumno(s)`}</p>
        <div className="alumno-results">{encontrados.map(a=><button key={a.id} disabled={ocupado} className={`alumno-result ${seleccion?.id===a.id?'selected':''}`} aria-pressed={seleccion?.id===a.id} onClick={()=>seleccionar(a)}><strong>{a.nombre}</strong><span>{a.grado || '—'}º {a.seccion} · {a.materia}</span>{a.ciclo_escolar && <small>Ciclo {a.ciclo_escolar}</small>}</button>)}{!cargando && !encontrados.length && <p>{lista.length?'No hay coincidencias. Prueba con otro nombre o grado.':'Agrega alumnos desde Mi Grupo para consultar sus perfiles.'}</p>}</div>
      </aside>
      <section className="alumno-content" aria-label="Perfil del alumno">
        {error && <div role="alert" className="alumno-message error">{error}</div>}{aviso && <div role="status" className="alumno-message">{aviso}</div>}
        {!seleccion && <div className="alumno-empty"><span aria-hidden="true">👤</span><h2>El expediente de cada alumno, en un lugar</h2><p>Busca por nombre{variante==='secundaria'?' y grado':''} y selecciona un alumno para consultar su información.</p></div>}
        {cargandoDetalle && <p role="status">Cargando perfil y calificaciones…</p>}
        {detalle && <>
          <div className="alumno-identity"><div className="alumno-avatar">{perfil.foto_url?<img src={perfil.foto_url} alt={`Foto de ${seleccion.nombre}`} />:<span aria-label="Sin foto">👤</span>}</div><div className="alumno-identity-text"><h2>{seleccion.nombre}</h2><p>{seleccion.grado || '—'}º {seleccion.seccion} · {seleccion.materia}</p><p>Ciclo: {seleccion.ciclo_escolar || 'Sin registrar'}</p>{editado && <small className="alumno-unsaved">Cambios sin guardar</small>}</div></div>
          <div className="alumno-actions"><button onClick={exportar} disabled={ocupado || editado}>↓ Exportar expediente ZIP</button><button onClick={imprimir} disabled={ocupado || editado}>🖨 Imprimir / PDF</button></div>
          <nav className="alumno-tabs" role="tablist" aria-label="Secciones del alumno">{TABS.map(([id,label])=><button key={id} id={`alumno-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`alumno-panel-${id}`} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}{id==='expediente'?` (${detalle.archivos.length})`:''}</button>)}</nav>
          <div role="tabpanel" id={`alumno-panel-${tab}`} aria-labelledby={`alumno-tab-${tab}`} className="alumno-panel">
            {tab==='perfil' && <form onSubmit={guardarPerfil}><div className="alumno-photo-actions"><label className="alumno-file-label">Cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={foto} /></label>{perfil.foto_url && <button type="button" disabled={ocupado} onClick={()=>cambiar('foto_url','')}>Quitar foto</button>}</div>{CAMPOS_PERFIL.map(([section,fields])=><fieldset key={section} disabled={ocupado}><legend>{section}</legend><div className="alumno-fields">{fields.map(([name,label,type])=><label key={name}>{label}{name==='otros_datos'?<textarea value={perfil[name] || ''} onChange={e=>cambiar(name,e.target.value)} rows={4}/>:<input type={type || 'text'} value={perfil[name] || ''} onChange={e=>cambiar(name,e.target.value)} />}</label>)}</div></fieldset>)}<button className="alumno-primary" type="submit" disabled={ocupado || !editado}>{ocupado?'Guardando…':'Guardar perfil'}</button></form>}
            {tab==='calificaciones' && <>
              <h3>Calificaciones por trimestre</h3>
              <p className="alumno-muted">{seleccion.materia} · {seleccion.grado || '—'}º {seleccion.seccion}. Incluye las evaluaciones vinculadas a Control QR.</p>
              {tablaCalificaciones.periodos.length ? <div className="alumno-table-scroll">
                <table className="alumno-grades-table" aria-label="Calificaciones por materia y trimestre">
                  <thead><tr><th scope="col">Campo / materia</th>{tablaCalificaciones.periodos.map(p => <th scope="col" key={p.id}>{p.nombre}<small>{p.inicio} a {p.fin}</small></th>)}</tr></thead>
                  <tbody>{tablaCalificaciones.materias.map(m => <tr key={m.id}><th scope="row">{m.nombre}</th>{m.notas.map((nota, i) => <td key={tablaCalificaciones.periodos[i].id}><strong>{nota == null ? 'Sin calificación' : nota.toFixed(1)}</strong></td>)}</tr>)}</tbody>
                </table>
              </div> : <p>Configura los trimestres del ciclo escolar para consultar las calificaciones.</p>}
              {!detalle.criterios.length && <p>No hay criterios de evaluación registrados para este grupo.</p>}
            </>}
            {tab==='expediente' && <><h3>Documentos del expediente</h3><p className="alumno-muted">PDF, imágenes y otros documentos. Máximo 20 MB por archivo. Se conserva una copia dentro de la aplicación.</p><div className="alumno-upload"><label>Categoría<select value={categoria} disabled={ocupado} onChange={e=>setCategoria(e.target.value)}>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select></label><button className="alumno-primary" disabled={ocupado} onClick={()=>fileInput.current.click()}>+ Cargar archivos</button><input ref={fileInput} type="file" multiple hidden disabled={ocupado} onChange={cargarArchivos} /></div><ul className="alumno-documents">{detalle.archivos.map(file=><li key={file.id}><div><span className="alumno-category">{file.categoria}</span><strong>{file.nombre}</strong><small>{fecha(file.fecha)} · {peso(file.tamano)}</small></div><div className="alumno-document-actions"><button disabled={ocupado} onClick={()=>descargar(file)} aria-label={`Exportar ${file.nombre}`}>Exportar archivo</button><button className="alumno-danger" disabled={ocupado} onClick={()=>eliminar(file)} aria-label={`Eliminar ${file.nombre}`}>Eliminar</button></div></li>)}</ul>{!detalle.archivos.length && <div className="alumno-empty small"><p>El expediente aún no tiene archivos.</p><p>Elige una categoría y carga el primer documento.</p></div>}</>}
            {tab==='seguimiento' && <AlumnoSeguimiento key={seleccion.id} detalle={detalle} automaticas={automaticas} configCiclo={configCiclo} variante={variante} materia={seleccion.materia} />}
          </div>
        </>}
        {ocupado && <p className="alumno-busy" role="status">Procesando…</p>}
      </section>
    </div>
    {datosReporte && <div className="alumno-print" dangerouslySetInnerHTML={{__html:htmlPerfil(datosReporte).split('<body>')[1].split('</body>')[0]}} />}
  </main>;
}
