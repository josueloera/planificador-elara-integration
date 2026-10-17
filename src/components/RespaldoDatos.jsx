import React, {useState} from 'react';

export default function RespaldoDatos(){
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const execute=async action=>{
    if(busy)return;
    if(action==='import-backup'&&!window.confirm('Importar reemplazará los datos actuales por los del respaldo. Se conservará una copia automática de los datos actuales. La aplicación se reiniciará al terminar. ¿Continuar?'))return;
    setBusy(true);setNotice('');setError('');
    try{
      const ipc=window.require?.('electron')?.ipcRenderer;
      if(!ipc)throw Error('Abre Ajustes desde la aplicación instalada.');
      const result=await ipc.invoke(action);
      if(result?.cancelled||result?.canceled)return;
      if(action==='import-backup'){
        setNotice('Respaldo importado. Reiniciando la aplicación…');
        if(window.planificadorAndroid)window.location.reload();
        else await ipc.invoke('restart-after-backup');
      }else setNotice('Respaldo completo guardado. Puedes copiar este archivo a otro equipo.');
    }catch(e){setError(e.message||'No se pudo completar la operación.');}
    finally{setBusy(false);}
  };
  return <section aria-label="Respaldo y traslado de datos" style={{margin:'20px 0',padding:18,border:'1px solid #cbd5e1',borderRadius:10,background:'#f8fafc',color:'#334155'}}>
    <h3 style={{marginTop:0}}>Respaldo y traslado de datos</h3>
    <p>Guarda toda tu base de datos: grupos, alumnos, fotos, expedientes, planeaciones, tareas, trabajos, calificaciones y ajustes.</p>
    <p>El mismo archivo sirve para Windows, Mac y Android de tu edición. Los datos de Primaria y Secundaria se mantienen separados.</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
      <button type="button" disabled={busy} onClick={()=>execute('export-backup')}>Exportar respaldo completo</button>
      <button type="button" disabled={busy} onClick={()=>execute('import-backup')}>Importar respaldo</button>
    </div>
    {busy&&<p role="status">Procesando base de datos…</p>}
    {notice&&<p role="status">{notice}</p>}
    {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  </section>;
}
