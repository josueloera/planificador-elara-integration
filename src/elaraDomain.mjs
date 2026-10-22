export const RELEASE = '1.0.31';
export function cteKey(edition, group, cycle) {
  const school=String(group?.escuela_id || group?.escuela || cycle?.cct || cycle?.nombreEscuela || '').trim();
  if (!school) throw Error('Asigna una escuela al grupo antes de abrir CTE.');
  return 'elara:cte:v1:'+JSON.stringify([edition,school,String(group.ciclo_escolar || cycle.fechaInicioStr)]);
}
export function newSessions(events={},cycleStart) {
  const year=String(cycleStart||'').slice(0,4);
  const dates=Object.keys(events).filter(d=>events[d]==='CTE'&&(!year||(d>=year+'-08-01'&&d<=(Number(year)+1)+'-07-31'))).sort();
  const intensive=dates.filter(d=>d.slice(5,7)==='08'),ordinary=dates.filter(d=>d.slice(5,7)!=='08');
  return Array.from({length:13},(_,i)=>({id:i+1,type:i<5?'Extraordinaria':'Ordinaria',number:i<5?i+1:i-4,
    date:(i<5?intensive[i]:ordinary[i-5])||'',place:'',participants:'',purpose:'',agenda:'',narrative:'',products:'',notes:'',conclusions:'',agreements:[],evidence:[]}));
}
export function validateAssignment(a, students, criteria) {
  if (!a.subject?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email||'')) throw Error('Indica materia y correo del especialista.');
  const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  if (!date(a.start)||!date(a.end)||a.start>a.end) throw Error('Revisa las fechas del periodo.');
  if (!students.length) throw Error('El grupo no tiene alumnos.');
  const criterion=criteria.find(c=>String(c.id)===String(a.criterionId));
  if (!criterion || !(Number(criterion.porcentaje)>0)) throw Error('Selecciona un criterio con porcentaje mayor que cero.');
  if (Math.abs(criteria.reduce((s,c)=>s+Number(c.porcentaje||0),0)-100)>0.01) throw Error('Los criterios del campo deben sumar 100 %. Ajústalos en Evaluaciones.');
  return {...a,criterionId:criterion.id,weight:Number(criterion.porcentaje),students:students.map(s=>({id:s.id,name:s.nombre}))};
}
export function reconcileResponses(assignment, incoming) {
  const records={...(assignment.records||{})}, history=[...(assignment.history||[])];
  for (const r of incoming) {
    if (!assignment.students.some(s=>String(s.id)===String(r.studentId))) throw Error('La respuesta contiene un alumno ajeno al formulario.');
    if (String(r.email||'').trim().toLowerCase()!==assignment.email.trim().toLowerCase()) continue;
    if (r.grade==='' || r.grade==null) continue;
    const grade=Number(r.grade);
    if (!Number.isFinite(grade)||grade<0||grade>10) throw Error('Calificación fuera de la escala de 0 a 10.');
    if (!r.responseId || !Number.isFinite(Date.parse(r.timestamp))) throw Error('Respuesta sin identificación o fecha válida.');
    const old=records[r.studentId];
    if (old && (Date.parse(old.timestamp)>Date.parse(r.timestamp) || (old.responseId===r.responseId && old.timestamp===r.timestamp && old.grade===grade && old.observation===(r.observation||'')))) continue;
    if (old) history.push({...old,studentId:r.studentId,replacedAt:new Date().toISOString()});
    records[r.studentId]={...r,grade,observation:r.observation||''};
  }
  return {...assignment,records,history};
}
