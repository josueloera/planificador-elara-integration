import React, { useEffect, useState } from 'react';
import { cteKey } from './elaraDomain.mjs';
import { guardarDocumento } from './seguimientoDocente';

export function agreementEvents(data) {
  return (data?.sessions || []).flatMap(s => (s.agreements || []).filter(a => a.due && a.text?.trim()).map(a => ({...a, session:s.number, type:s.type, id:`${s.id}:${a.id}`})));
}
export function useCteCalendar(ipc, edition, group, cycle) {
  const [events,setEvents]=useState([]);
  let key='';try{key=cteKey(edition,group,cycle);}catch{}
  useEffect(()=>{
    let live=true, checking=false;
    setEvents([]);
    if(!ipc||!key)return;
    const check=async()=>{
      if(checking)return;checking=true;
      try {
        const value=await ipc.invoke('get-config-value',key);
        const rows=agreementEvents(value?JSON.parse(value):null);
        if(!live)return;
        setEvents(rows);
        for(const a of rows) {
          if(!live||a.status==='Cumplido'||!a.reminder||!Number.isFinite(Date.parse(a.reminder))||Date.parse(a.reminder)>Date.now())continue;
          const marker=`${key}:aviso:${a.id}:${a.reminder}`;
          if(await ipc.invoke('get-config-value',marker))continue;
          if(!live)return;
          await guardarDocumento(ipc,marker,{shownAt:new Date().toISOString()});
          if(live) window.alert(`Recordatorio CTE\n${a.text}\nResponsable: ${a.owner||'Sin asignar'}\nFecha límite: ${a.due}`);
        }
      } catch(error) { console.error('No se pudieron consultar los acuerdos CTE:',error); }
      finally {checking=false;}
    };
    check();const timer=setInterval(check,30000);
    window.addEventListener('cte-guardado',check);
    return()=>{live=false;clearInterval(timer);window.removeEventListener('cte-guardado',check);};
  },[ipc,key]);
  return events;
}
export function CteAgenda({events,year,month,onOpen}) {
  const prefix=`${year}-${String(month).padStart(2,'0')}`;
  const rows=events.filter(a=>a.due.startsWith(prefix)).sort((a,b)=>a.due.localeCompare(b.due));
  return <section style={{background:'white',padding:16,color:'#172033'}}><h3>Acuerdos CTE del mes</h3>{rows.length?<table><thead><tr><th>Fecha límite</th><th>Acuerdo</th><th>Responsable</th><th>Estado</th><th>Aviso programado</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{a.due}</td><td>{a.text}</td><td>{a.owner}</td><td>{a.status}</td><td>{a.reminder?.replace('T',' ')||'Sin aviso'}</td></tr>)}</tbody></table>:<p>No hay acuerdos con fecha límite en este mes.</p>}<button className="no-print" onClick={onOpen}>Abrir bitácora CTE</button></section>;
}
