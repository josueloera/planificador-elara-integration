import {useEffect} from 'react';
import {reconcileResponses} from '../elaraDomain.mjs';
import {googleCall} from './GoogleService';
export default function GoogleSync({ipc}){
 useEffect(()=>{let running=false,disposed=false;
  const sync=async()=>{
   if(running||disposed||!navigator.onLine)return;let connection;try{connection=JSON.parse(sessionStorage.getItem('elara-google'));}catch{return;}if(!connection?.email)return;
   running=true;const failures=[];
   try{const config=await ipc.invoke('get-config');
    for(const [key,value] of Object.entries(config)){
     if(disposed)return;if(!key.startsWith('elara:specialists:v1:'))continue;const context=JSON.parse(key.slice('elara:specialists:v1:'.length));if(context.start!==config.fechaInicioStr)continue;
     for(const a of JSON.parse(value)){
      if(!a.formId)continue;
      try{const r=await googleCall(ipc,connection,'sync',a);if(r.formId!==a.formId)throw Error('Formulario de otra cuenta.');const next=reconcileResponses(a,r.rows);if(JSON.stringify(next.records)!==JSON.stringify(a.records))await ipc.invoke('elara-specialists-import',{key,context,assignment:next,expectedRecords:a.records||{}});}
      catch(e){failures.push(a.subject+': '+e.message);}
     }
    }
   }catch(e){failures.push(e.message);}finally{running=false;sessionStorage.setItem('elara-google-sync',JSON.stringify({date:new Date().toISOString(),failures}));window.dispatchEvent(new Event('elara-google-synced'));}
  };
  sync();const timer=setInterval(sync,120000);window.addEventListener('online',sync);window.addEventListener('elara-google-connected',sync);
  return()=>{disposed=true;clearInterval(timer);window.removeEventListener('online',sync);window.removeEventListener('elara-google-connected',sync);};
 },[ipc]);return null;
}
