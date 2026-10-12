import { promedioPeriodo } from './evaluacionAutomatica.js';

export const CATEGORIAS = ['Comprobante de domicilio','INE del tutor','Acta de nacimiento','CURP','Examen trimestral','Trabajo','Otro'];
export const CAMPOS_PERFIL = [
  ['Datos personales', [['curp','CURP'],['f_nacimiento','Fecha de nacimiento','date'],['edad','Edad'],['direccion','Domicilio']]],
  ['Salud', [['tipo_sangre','Tipo de sangre'],['alergias','Alergias / padecimientos'],['servicio_medico','Servicio médico'],['peso','Peso (kg)'],['estatura','Estatura (cm)']]],
  ['Familia y contacto', [['nombre_mama','Nombre de la madre'],['tel_mama','Teléfono de la madre','tel'],['nombre_papa','Nombre del padre'],['tel_papa','Teléfono del padre','tel'],['nombre_tutor','Nombre del tutor'],['parentesco_tutor','Parentesco del tutor'],['tel_tutor','Teléfono del tutor','tel'],['email_tutor','Correo del tutor','email'],['contacto_emergencia','Contacto de emergencia'],['tel_emergencia','Teléfono de emergencia','tel']]],
  ['Observaciones', [['otros_datos','Otros datos relevantes']]]
];
const FIELDS = [['LENGUAJES','Lenguajes'],['SABERES','Saberes y pensamiento científico'],['ETICA','Ética, naturaleza y sociedades'],['HUMANO','De lo humano y lo comunitario']];
export const normalizar = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export const nombreSeguro = value => String(value || 'Alumno').normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100) || 'Alumno';
export const escaparHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function filtrarAlumnos(alumnos, busqueda, grado = '') {
  const tokens = normalizar(busqueda).split(/\s+/).filter(Boolean);
  return alumnos.filter(a => (!grado || String(a.grado) === String(grado)) && tokens.every(token => normalizar(`${a.nombre} ${a.grado || ''} ${a.seccion || ''} ${a.materia || ''}`).includes(token)));
}
export function construirCalificaciones(detalle, automaticas, periodos, variante, materia) {
  const result = [];
  for (const [id, periodo] of Object.entries(periodos || {})) {
    const notas = detalle.notas.filter(n => n.fecha >= periodo.inicio && n.fecha <= periodo.fin && Number(n.alumno_id) === Number(detalle.alumno.id));
    const original = automaticas[id];
    const automatica = original && { ...original, notas: (original.notas || []).filter(n => Number(n.alumno_id) === Number(detalle.alumno.id) && n.fecha >= periodo.inicio && n.fecha <= periodo.fin) };
    for (const [campo, nombre] of variante === 'secundaria' ? [['MATERIA',materia || 'Materia del grupo']] : FIELDS) {
      const criterios = variante === 'secundaria' ? detalle.criterios : detalle.criterios.filter(c => c.campo === campo || (!c.campo && campo === 'LENGUAJES'));
      result.push({ periodoId: id, periodo: periodo.nombre || `Trimestre ${id}`, inicio: periodo.inicio, fin: periodo.fin, campo, materia: nombre, nota: promedioPeriodo(criterios, notas, automatica, detalle.alumno.id) });
    }
  }
  return result;
}
export function crearTablaCalificaciones(calificaciones = []) {
  const periodos = new Map(), materias = new Map();
  for (const nota of calificaciones) {
    const periodoId = String(nota.periodoId ?? JSON.stringify([nota.periodo, nota.inicio, nota.fin]));
    const materiaId = nota.campo || nota.materia;
    if (!periodos.has(periodoId)) periodos.set(periodoId, { id: periodoId, nombre: nota.periodo, inicio: nota.inicio, fin: nota.fin });
    if (!materias.has(materiaId)) materias.set(materiaId, { id: materiaId, nombre: nota.materia, porPeriodo: new Map() });
    materias.get(materiaId).porPeriodo.set(periodoId, nota.nota);
  }
  const columnas = [...periodos.values()].sort((a, b) => String(a.inicio || '').localeCompare(String(b.inicio || '')));
  return {
    periodos: columnas,
    materias: [...materias.values()].map(({ id, nombre, porPeriodo }) => ({ id, nombre, notas: columnas.map(p => porPeriodo.get(p.id) ?? null) }))
  };
}

function materiaDelRegistro(campo, variante, materia, esCriterio = false) {
  if (variante === 'secundaria') return { id: 'MATERIA', nombre: materia || 'Materia del grupo' };
  const nombre = String(campo || (esCriterio ? 'LENGUAJES' : '')).trim();
  const clave = normalizar(nombre).replace(/[^a-z]/g, '');
  const id = clave === 'lenguajes' ? 'LENGUAJES' : clave.startsWith('saberes') ? 'SABERES' :
    clave.startsWith('etica') ? 'ETICA' : clave === 'humano' || clave.startsWith('delohumano') ? 'HUMANO' : clave || 'SIN_MATERIA';
  return { id, nombre: FIELDS.find(([key]) => key === id)?.[1] || nombre || 'Sin campo / materia' };
}

function agruparPorMateria(registros, variante, materia, esCriterio) {
  const grupos = new Map();
  for (const registro of registros || []) {
    const campo = materiaDelRegistro(esCriterio ? registro.criterio?.campo : registro.campo, variante, materia, esCriterio);
    if (!grupos.has(campo.id)) grupos.set(campo.id, { ...campo, registros: [] });
    grupos.get(campo.id).registros.push(registro);
  }
  const orden = FIELDS.map(([id]) => id);
  return [...grupos.values()].sort((a, b) => {
    const posicion = id => orden.includes(id) ? orden.indexOf(id) : orden.length;
    return posicion(a.id) - posicion(b.id) || a.nombre.localeCompare(b.nombre, 'es');
  });
}

export function agruparTrabajosPorMateria(trabajos, variante, materia) {
  return agruparPorMateria(trabajos, variante, materia, false);
}

export function agruparEvaluacionesPorMateria(evaluaciones, variante, materia) {
  return agruparPorMateria(evaluaciones, variante, materia, true).map(grupo => {
    const criterios = grupo.registros.map(n => ({ ...n.criterio, id: Number(n.criterio_id) }));
    const notas = grupo.registros.map(n => ({ ...n, criterio_id: Number(n.criterio_id), alumno_id: Number(n.alumno_id) }));
    return {
      ...grupo,
      evaluados: notas.filter(n => n.valor != null && String(n.valor).trim() !== '' && Number.isFinite(Number(n.valor))).length,
      promedio: promedioPeriodo(criterios, notas, null, notas[0]?.alumno_id)
    };
  });
}

export function htmlPerfil({ alumno, perfil, calificaciones, archivos, incidencias = [], asistencia = [], trabajos = [], escuela = {} }) {
  const e = escaparHtml;
  const tablaCalificaciones = crearTablaCalificaciones(calificaciones);
  const foto = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(perfil.foto_url || '') ? `<img class="foto" alt="Foto del alumno" src="${perfil.foto_url}">` : '';
  const table = (headers, rows) => `<table><thead><tr>${headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Perfil de ${e(alumno.nombre)}</title><style>body{font:14px system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#172b42}header{display:flex;gap:20px;align-items:center;border-bottom:3px solid #167868;padding-bottom:16px}.foto{width:100px;height:120px;object-fit:cover;border-radius:8px}h1{font-size:25px;margin:0 0 8px}h2{font-size:18px;margin-top:26px}dl{display:grid;grid-template-columns:180px 1fr;gap:8px}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ccd4da;text-align:left;padding:8px;overflow-wrap:anywhere}th{background:#eef5f3}section,tr{break-inside:avoid}@media print{body{margin:0;max-width:none}button{display:none}@page{size:letter;margin:14mm}}</style></head><body><header>${foto}<div><h1>${e(alumno.nombre)}</h1><div>${e(escuela.nombreEscuela || 'Planificador Docente')} · ${e(escuela.cct || '')}</div><p>${e(alumno.grado || '—')}º ${e(alumno.seccion || '')} · ${e(alumno.materia || alumno.tipo || '')} · Ciclo ${e(alumno.ciclo_escolar || '')}</p></div></header>${CAMPOS_PERFIL.map(([section, fields])=>`<section><h2>${e(section)}</h2><dl>${fields.map(([field,label])=>`<dt>${e(label)}</dt><dd>${e(perfil[field] || 'Sin registrar')}</dd>`).join('')}</dl></section>`).join('')}<h2>Calificaciones</h2>${table(['Campo / materia',...tablaCalificaciones.periodos.map(p=>p.nombre)],tablaCalificaciones.materias.map(m=>[m.nombre,...m.notas.map(n=>n == null ? 'Sin calificación' : n.toFixed(1))]))}<h2>Expediente</h2>${table(['Categoría','Archivo','Fecha'],archivos.map(a=>[a.categoria,a.nombre,a.fecha.slice(0,10)]))}<h2>Trabajos QR</h2>${table(['Fecha','Trabajo','Campo / materia','Calificación'],trabajos.map(t=>[t.fecha,t.nombre_trabajo,alumno.materia === 'Primaria' ? t.campo : alumno.materia,t.valor ?? 'Sin calificación']))}<h2>Incidencias</h2>${table(['Fecha','Situación','Medidas'],incidencias.map(i=>[i.fecha,i.situacion,i.medidas]))}<h2>Asistencia</h2>${table(['Fecha','Estado'],asistencia.map(a=>[a.fecha,a.estado]))}<p>Generado el ${e(new Date().toLocaleDateString('es-MX'))}. Las calificaciones corresponden a los períodos configurados y al grupo del alumno.</p></body></html>`;
}

// ZIP sin compresión: funciona sin dependencias en escritorio y WebView Android.
const crcTable = Array.from({length:256},(_,n)=>{ let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; return c>>>0; });
const crc32 = data => { let c=0xffffffff; for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
export function crearZip(entries) {
  const local = [], central = []; let offset = 0, directorySize = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const data = typeof entry.data === 'string' ? new TextEncoder().encode(entry.data) : entry.data;
    const crc = crc32(data);
    const header = new Uint8Array(30+name.length), hv = new DataView(header.buffer);
    hv.setUint32(0,0x04034b50,true); hv.setUint16(4,20,true); hv.setUint16(6,0x800,true); hv.setUint16(12,33,true); hv.setUint32(14,crc,true); hv.setUint32(18,data.length,true); hv.setUint32(22,data.length,true); hv.setUint16(26,name.length,true); header.set(name,30);
    local.push(header,data);
    const record = new Uint8Array(46+name.length), rv = new DataView(record.buffer);
    rv.setUint32(0,0x02014b50,true); rv.setUint16(4,20,true);rv.setUint16(6,20,true);rv.setUint16(8,0x800,true);rv.setUint16(14,33,true);rv.setUint32(16,crc,true);rv.setUint32(20,data.length,true);rv.setUint32(24,data.length,true);rv.setUint16(28,name.length,true);rv.setUint32(42,offset,true);record.set(name,46);
    central.push(record);directorySize+=record.length;offset+=header.length+data.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,directorySize,true);ev.setUint32(16,offset,true);
  return new Blob([...local,...central,end],{type:'application/zip'});
}
export const leerArchivo = file => new Promise((resolve,reject)=>{ const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No se pudo leer el archivo.'));reader.readAsDataURL(file); });
export const bytesBase64 = base64 => Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
export async function guardarArchivo(blob, name) {
  if(window.planificadorAndroid?.native) {
    const data = await leerArchivo(blob);
    return window.planificadorAndroid.native.saveDocument({base64:data.split(',')[1],mime:blob.type || 'application/octet-stream',name});
  }
  const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {saved:true};
}
