/** Elara: instala ESTE script en la cuenta de Google del docente titular. */
function configurarElara() {
 const p=PropertiesService.getScriptProperties();
 if(!p.getProperty('ELARA_SECRET'))p.setProperty('ELARA_SECRET',Utilities.getUuid()+Utilities.getUuid());
 console.log('Clave privada de conexión (no compartir): '+p.getProperty('ELARA_SECRET'));
 console.log('Cuenta: '+Session.getEffectiveUser().getEmail());
}
function doPost(e) {
 const out=v=>ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);
 const lock=LockService.getScriptLock();
 try {
  const q=JSON.parse(e.postData.contents),p=PropertiesService.getScriptProperties();
  if(!p.getProperty('ELARA_SECRET')||q.secret!==p.getProperty('ELARA_SECRET'))throw Error('Conexión no autorizada.');
  if(!lock.tryLock(20000))throw Error('Servicio ocupado. Intenta de nuevo.');
  if(q.action==='status')return out({ok:true,email:Session.getEffectiveUser().getEmail(),quota:MailApp.getRemainingDailyQuota()});
  const a=q.assignment;
  if(!a||!String(a.id).match(/^[a-zA-Z0-9-]{20,80}$/))throw Error('Solicitud inválida.');
  const key='form:'+a.id;
  let record=JSON.parse(p.getProperty(key)||'null');
  if(q.action==='create'&&!record){
   if(!a.students?.length||a.students.length>100||!a.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))throw Error('Revisa alumnos y correo.');
   const form=FormApp.create('Elara · '+a.subject+' · '+a.school+' · '+a.groupLabel);
   if(!form.supportsAdvancedResponderPermissions())throw Error('Esta cuenta no permite restringir los destinatarios del formulario.');
   form.setPublished(false);
   form.addPublishedReader(a.email);
   form.setDescription('Periodo: '+a.start+' al '+a.end+'. Especialista: '+a.email+'. Captura calificaciones de 0 a 10; deja sin respuesta los pendientes. Solo se incorporarán respuestas del correo asignado.');
   form.setCollectEmail(true);form.setAllowResponseEdits(true);form.setPublishingSummary(false);
   const items={};
   a.students.forEach(s=>{
    const grade=form.addTextItem().setTitle(s.name+' · Calificación').setRequired(false);
    grade.setValidation(FormApp.createTextValidation().requireNumberBetween(0,10).setHelpText('Número de 0 a 10.').build());
    const observation=form.addParagraphTextItem().setTitle(s.name+' · Observaciones').setRequired(false);
    items[String(s.id)]={grade:String(grade.getId()),observation:String(observation.getId())};
   });
   form.setPublished(true);
   record={formId:form.getId(),url:form.getPublishedUrl(),email:a.email.toLowerCase(),items,sent:false};
   p.setProperty(key,JSON.stringify(record));
  }
  if(!record)throw Error('No se encontró el formulario en esta cuenta.');
  if(q.action==='create')return out({ok:true,formId:record.formId,url:record.url,sent:record.sent});
  if(q.action==='send'){
   if(!record.sent){if(MailApp.getRemainingDailyQuota()<1)throw Error('La cuenta agotó su cuota diaria de correo.');
    MailApp.sendEmail({to:record.email,subject:'Elara · Evaluación de '+a.subject,body:'Puedes registrar las calificaciones de tu grupo en este formulario:\n'+record.url+'\n\nAccede con '+record.email+'. No compartas el enlace ni los datos del alumnado.'});
    record.sent=true;p.setProperty(key,JSON.stringify(record));}
   return out({ok:true,sent:true});
  }
  if(q.action==='sync'){
   const rows=[];FormApp.openById(record.formId).getResponses().forEach(r=>{
    const email=(r.getRespondentEmail()||'').toLowerCase();if(email!==record.email)return;
    const answers={};r.getItemResponses().forEach(i=>answers[String(i.getItem().getId())]=i.getResponse());
    Object.keys(record.items).forEach(id=>{const item=record.items[id];rows.push({studentId:id,grade:answers[item.grade]??'',observation:answers[item.observation]||'',responseId:r.getId(),timestamp:r.getTimestamp().toISOString(),email});});
   });return out({ok:true,rows,formId:record.formId});
  }
  throw Error('Acción no reconocida.');
 }catch(error){return out({ok:false,error:error.message});}finally{if(lock.hasLock())lock.releaseLock();}
}
