import React from 'react';
import { createRoot } from 'react-dom/client';
const variant = new URLSearchParams(location.search).get('edition') || 'primaria';
const platform = new URLSearchParams(location.search).get('platform') || 'desktop';
const groups=[{id:1,grado:1,seccion:'A',disciplina_id:1,tipo:variant==='primaria'?'Primaria':'Materia Regular',ciclo_escolar:'2026-2027'},{id:2,grado:2,seccion:'B',disciplina_id:2,tipo:'Materia Regular',ciclo_escolar:'2026-2027'}];
const pupils=[{id:1,nombre:'José Pérez',grupo_id:1},{id:2,nombre:'José Pérez',grupo_id:2},{id:3,nombre:'Ana López',grupo_id:1},...Array.from({length:24},(_,i)=>({id:i+4,nombre:`Alumno ${String(i+1).padStart(2,'0')}`,grupo_id:1}))];
const profiles={1:{curp:'PRUEBA123',nombre_tutor:'María Pérez',tel_tutor:'5555555555',direccion:'Calle Escuela 12'}};
let nextId=1;const documents=[];window.uiCalls=[];window.uiDownloads=[];window.uiPrinted=0;
const ipc={
  async invoke(name,...args){
    window.uiCalls.push({name,args});
    const [id,data]=args;
    if(name==='get-license-status')return {isActivated:true};
    if(name==='get-config')return {fechaInicioStr:'2026-08-31',periodos:JSON.stringify({1:{nombre:'1º Trimestre',inicio:'2026-08-31',fin:'2026-11-27'},2:{nombre:'2º Trimestre',inicio:'2026-11-30',fin:'2027-03-19'},3:{nombre:'3º Trimestre',inicio:'2027-03-20',fin:'2027-07-21'}})};
    if(name==='get-grupos')return groups;
    if(name==='get-disciplinas'||name==='get-disciplinas-por-grado')return [{id:1,nombre:'Español'},{id:2,nombre:'Matemáticas'}];
    if(name==='get-alumnos')return pupils.filter(p=>!id||p.grupo_id===id);
    if(name==='alumno-buscar')return pupils.map(p=>({...groups.find(g=>g.id===p.grupo_id),...p}));
    if(name==='alumno-get-detalle')return {alumno:{...groups.find(g=>g.id===pupils.find(p=>p.id===id).grupo_id),...pupils.find(p=>p.id===id)},perfil:profiles[id] || {},criterios:[{id:101,campo:'LENGUAJES',nombre:'Trabajo',porcentaje:100}],notas:[],archivos:documents.filter(d=>d.alumno_id===id).map(({contenido,...d})=>d),incidencias:[{id:1,fecha:'2026-10-10',situacion:'Participación',medidas:'Seguimiento de clase'}],asistencia:[{id:1,fecha:'2026-10-10',estado:'PRESENTE'}]};
    if(name==='get-evaluacion-automatica')return {enlaces:[{criterio_id:101}],notas:[{alumno_id:1,criterio_id:101,fecha:'2026-10-10',valor:8.5}]};
    if(name==='alumno-save-perfil'){profiles[id?.alumno_id]={...id};return {...id};}
    if(name==='alumno-add-documento'){documents.push({...data,id:nextId++,alumno_id:id,fecha:'2026-10-10T00:00:00Z'});return documents.at(-1);}
    if(name==='alumno-list-expediente')return documents.filter(d=>d.alumno_id===id).map(({contenido,...d})=>d);
    if(name==='alumno-get-documento')return documents.find(d=>d.alumno_id===id&&d.id===data);
    if(name==='alumno-delete-documento'){const index=documents.findIndex(d=>d.alumno_id===id&&d.id===data);documents.splice(index,1);return true;}
    if(name==='get-eventos-oficiales'||name==='get-perfil'||name==='get-todos-perfiles'||name==='get-vistos')return {};
    return [];
  }, on(){return this;},removeListener(){},removeAllListeners(){},send(){}
};
window.require=name=>{if(name==='electron')return {ipcRenderer:ipc};throw new Error('No disponible en prueba: '+name);};
window.print=()=>{window.uiPrinted++;};
window.confirm=()=>true;
window.planificadorAndroid={native:{async saveDocument(data){window.uiDownloads.push(data);return {saved:true};}}};
const {default:App}=await import('/src/App.jsx');
await import('/src/index.css');
createRoot(document.getElementById('root')).render(React.createElement(App));
