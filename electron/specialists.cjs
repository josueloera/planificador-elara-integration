function registerSpecialists({ipcMain,db,transaction,onChange}) {
 const all=(sql,args=[])=>new Promise((ok,no)=>db.all(sql,args,(e,r)=>e?no(e):ok(r)));
 const run=(sql,args=[])=>new Promise((ok,no)=>db.run(sql,args,e=>e?no(e):ok()));
 ipcMain.handle('elara-specialists-import',(_,request)=>transaction(async()=>{
   const {key,assignment,context}=request;
   if (!key?.startsWith('elara:specialists:v1:') || key!=='elara:specialists:v1:'+JSON.stringify(context)) throw Error('Contexto de importación inválido.');
   const [group]=await all('SELECT * FROM grupos_maestro WHERE id=?',[context.groupId]);
   if(!group || String(group.escuela_id??group.escuela??'')!==context.school || Number(group.grado)!==context.grade || String(group.ciclo_escolar||'')!==context.cycle) throw Error('La escuela, grupo o ciclo ha cambiado. Abre de nuevo el módulo.');
   const [saved]=await all('SELECT valor FROM configuracion WHERE llave=?',[key]);
   const entries=JSON.parse(saved?.valor||'[]'), index=entries.findIndex(a=>a.id===assignment.id), old=entries[index];
   if(!old || ['formId','criterionId','field','start','end','email'].some(k=>old[k]!==assignment[k]) || JSON.stringify(old.students)!==JSON.stringify(assignment.students))throw Error('El formulario cambió. Vuelve a cargarlo.');
   const criteria=await all('SELECT * FROM criterios WHERE grupo_id=? AND campo=?',[group.id,old.field]);
   if(!criteria.some(c=>c.id===old.criterionId&&Number(c.porcentaje)===old.weight)||Math.abs(criteria.reduce((s,c)=>s+Number(c.porcentaje),0)-100)>0.01)throw Error('Los porcentajes cambiaron. Revisa el criterio antes de importar.');
   const links=await all('SELECT valor FROM configuracion WHERE llave LIKE ?',['evaluacion_qr_ciclo:'+group.id+':%']);
   if(links.some(r=>JSON.parse(r.valor).some(e=>Number(e.criterio_id)===old.criterionId)))throw Error('El criterio está vinculado a QR. Usa un criterio exclusivo del especialista.');
   if(JSON.stringify(old.records||{})!==JSON.stringify(request.expectedRecords||{}))throw Error('Las respuestas cambiaron durante la sincronización. Vuelve a sincronizar.');
   const [cycle]=await all("SELECT valor FROM configuracion WHERE llave='fechaInicioStr'");
   if(cycle?.valor!==context.start)throw Error('Cambió el ciclo activo. Abre de nuevo el módulo.');
   for(const [id,r] of Object.entries(assignment.records||{})) {
     if(!old.students.some(s=>String(s.id)===id)||!Number.isFinite(r.grade)||r.grade<0||r.grade>10||r.email.toLowerCase()!==old.email.toLowerCase())throw Error('Respuesta inválida.');
     if(!(await all('SELECT id FROM alumnos WHERE id=? AND grupo_id=?',[id,group.id])).length)throw Error('Un alumno ya no pertenece al grupo.');
     const existing=await all('SELECT valor FROM notas WHERE alumno_id=? AND criterio_id=? AND fecha=?',[id,old.criterionId,old.end]);
     if(existing.length && (!old.records?.[id] || existing.some(n=>Number(n.valor)!==old.records[id].grade)))throw Error('Existe una calificación manual en la fecha del periodo. Revísala antes de importar.');
     await run('DELETE FROM notas WHERE alumno_id=? AND criterio_id=? AND fecha=?',[id,old.criterionId,old.end]);
     await run('INSERT INTO notas (alumno_id,criterio_id,fecha,valor) VALUES (?,?,?,?)',[id,old.criterionId,old.end,r.grade]);
   }
   entries[index]=assignment;
   await run('INSERT OR REPLACE INTO configuracion (llave,valor) VALUES (?,?)',[key,JSON.stringify(entries)]);
   onChange?.(group.id);return entries;
 }));
}
module.exports={registerSpecialists};
