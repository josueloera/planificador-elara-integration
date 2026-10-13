const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const APARTADOS_PLANEACION = [
  { key: 'metodologia', label: 'Metodología' },
  { key: 'escenario', label: 'Escenario' },
  { key: 'temporalidad', label: 'Temporalidad' },
  { key: 'proposito', label: 'Propósito', multiline: true },
  { key: 'ejes_articuladores', label: 'Ejes articuladores', multiline: true },
  { key: 'campos_formativos', label: 'Campos formativos', multiline: true },
  { key: 'descripcion_problematica', label: 'Descripción de la problemática', multiline: true },
  { key: 'contenidos', label: 'Contenidos', multiline: true },
  { key: 'descripcion_metodologia', label: 'Descripción de la metodología a desarrollar', multiline: true },
  { key: 'fecha', label: 'Fecha' },
  { key: 'problematica_sesion', label: 'Problemática de la sesión', multiline: true },
  { key: 'fase', label: 'Fase' },
  { key: 'contenido_sesion', label: 'Contenido de la sesión', multiline: true },
  { key: 'pda_sesion', label: 'PDA de la sesión', multiline: true },
  { key: 'ejes_sesion', label: 'Ejes articuladores de la sesión', multiline: true },
  { key: 'fase_metodologia', label: 'Fase de la metodología' },
  { key: 'momento_metodologia', label: 'Momento de la metodología' },
  { key: 'materiales', label: 'Materiales', multiline: true },
  { key: 'actividad_inicial', label: 'Actividad inicial', multiline: true },
  { key: 'pregunta_detonadora', label: 'Pregunta detonadora', multiline: true },
  { key: 'actividad_desarrollo', label: 'Actividad de desarrollo', multiline: true },
  { key: 'cierre_actividad', label: 'Cierre de la actividad', multiline: true },
  { key: 'que_evaluar', label: '¿Qué evaluar?', multiline: true },
  { key: 'como_evaluar', label: '¿Cómo evaluar?', multiline: true },
  { key: 'con_que_evaluar', label: '¿Con qué evaluar?', multiline: true },
  { key: 'dominio_contenidos', label: 'Dominio de contenidos', multiline: true },
  { key: 'observaciones', label: 'Observaciones generales', multiline: true },
  { key: 'adecuaciones_curriculares', label: 'Adecuaciones curriculares', multiline: true }
];

export const FORMULARIO_PROYECTO = [
  { key: 'proposito', label: 'Propósito', multiline: true },
  { key: 'ejes_articuladores', label: 'Ejes articuladores', multiline: true },
  { key: 'campos_formativos', label: 'Campos formativos', multiline: true },
  { key: 'descripcion_problematica', label: 'Descripción de la problemática', multiline: true },
  { key: 'contenidos', label: 'Contenidos', multiline: true },
  { key: 'fecha', label: 'Fecha' },
  { key: 'descripcion_metodologia', label: 'Descripción de la metodología a desarrollar', multiline: true },
  { key: 'problematica_sesion', label: 'Problemática de la sesión', multiline: true },
  { key: 'fase', label: 'Fase' },
  { key: 'contenido_sesion', label: 'Contenido de la sesión', multiline: true },
  { key: 'pda_sesion', label: 'PDA de la sesión', multiline: true },
  { key: 'ejes_sesion', label: 'Ejes articuladores de la sesión', multiline: true },
  { key: 'fase_metodologia', label: 'Fase de la metodología' },
  { key: 'momento_metodologia', label: 'Momento de la metodología' },
  { key: 'materiales', label: 'Materiales', multiline: true },
  { key: 'actividad_inicial', label: 'Actividad inicial', multiline: true },
  { key: 'pregunta_detonadora', label: 'Pregunta detonadora', multiline: true },
  { key: 'actividad_desarrollo', label: 'Actividad de desarrollo', multiline: true },
  { key: 'cierre_actividad', label: 'Cierre de la actividad', multiline: true },
  { key: 'que_evaluar', label: '¿Qué evaluar?', multiline: true },
  { key: 'como_evaluar', label: '¿Cómo evaluar?', multiline: true },
  { key: 'con_que_evaluar', label: '¿Con qué evaluar?', multiline: true },
  { key: 'dominio_contenidos', label: 'Dominio de contenidos', multiline: true },
  { key: 'observaciones', label: 'Observaciones generales', multiline: true },
  { key: 'adecuaciones_curriculares', label: 'Adecuaciones curriculares', multiline: true }
];

export function exportarPlanoWord({ tipo, nombre, datos = {}, apartados = {}, pdas = [], fases = [], dias = [], extras = {} }) {
  const items = { ...(apartados || {}), recursos: extras.recursos ?? apartados.recursos, evaluacion_general: extras.evaluacion, adecuaciones_generales: extras.adecuaciones ?? apartados.adecuaciones };
  const metadata = [
    ['Escuela', datos.escuela || ''],
    ['CCT', datos.cct || ''],
    ['Docente', datos.docente || ''],
    ['Ciclo escolar', datos.ciclo || ''],
    ['Fase', items.fase || datos.fase || ''],
    ['Grado', datos.grado ? `${datos.grado}º` : ''],
    ['Escenario', datos.escenario || ''],
    ['Temporalidad', items.temporalidad || datos.temporalidad || ''],
    ['Fecha', items.fecha || datos.fecha || '']
  ];
  const fieldRows = (sections, source = items) => sections.map(({ key, label }) => {
    const value = source[key] || (key === 'descripcion_problematica' ? datos.problemática : key === 'metodologia' ? datos.metodologia : '');
    return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || 'Sin especificación.').replace(/\r?\n/g, '<br>')}</td></tr>`;
  }
  ).join('');
  const pdaRows = pdas.length ? pdas.map(p => `<tr><th>${escapeHtml(p.campo || 'Campo formativo')}</th><td><strong>${escapeHtml(p.proyecto_sugerido || p.proyecto || 'Contenido')}</strong><br>${escapeHtml(p.contenido || '')}<br>${escapeHtml(p.descripcion || p.pda || '')}</td></tr>`).join('') : '<tr><td colspan="2">Sin aprendizajes vinculados.</td></tr>';
  const faseRows = fases.map(({ label, value }) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || 'Sin especificación.').replace(/\r?\n/g, '<br>')}</td></tr>`).join('');
  const diaRows = dias.map(({ label, inicio, desarrollo, cierre }) => `<tr><th>${escapeHtml(label)}</th><td><strong>Inicio:</strong> ${escapeHtml(inicio || 'Sin especificación.').replace(/\r?\n/g, '<br>')}<br><strong>Desarrollo:</strong> ${escapeHtml(desarrollo || 'Sin especificación.').replace(/\r?\n/g, '<br>')}<br><strong>Cierre:</strong> ${escapeHtml(cierre || 'Sin especificación.').replace(/\r?\n/g, '<br>')}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(nombre)}</title><style>body{font:11pt Calibri,Arial,sans-serif;color:#222;margin:1.7cm}h1{color:#164c73;font-size:20pt;text-align:center;margin-bottom:4pt}h2{color:#164c73;font-size:13pt;border-bottom:1px solid #7298b2;padding-bottom:4pt;margin-top:20pt}p.sub{text-align:center;margin-top:0;color:#526879}table{width:100%;border-collapse:collapse;margin:8pt 0 14pt}th,td{border:1px solid #9aabb6;padding:7pt;vertical-align:top;text-align:left}th{background:#eaf0f4;width:25%}tr{page-break-inside:avoid}</style></head><body><h1>Plano didáctico</h1><p class="sub">${escapeHtml(tipo)} · ${escapeHtml(nombre || 'Sin título')}</p><table>${metadata.map(([label,value])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || 'Sin especificación.')}</td></tr>`).join('')}</table><h2>Propósito, ejes y campos formativos</h2><table>${fieldRows([{key:'proposito',label:'Propósito'},{key:'ejes_articuladores',label:'Ejes articuladores'},{key:'campos_formativos',label:'Campos formativos'},{key:'descripcion_problematica',label:'Descripción de la problemática'},{key:'contenidos',label:'Contenidos'}])}</table><h2>Procesos de desarrollo de aprendizaje (PDA)</h2><table>${pdaRows}</table><h2>Metodología</h2><table>${fieldRows([{key:'metodologia',label:'Metodología'}])}<tr><th>Descripción</th><td>${escapeHtml(items.descripcion_metodologia || 'Sin especificación.').replace(/\r?\n/g,'<br>')}</td></tr></table>${dias.length ? `<h2>Planeación semanal</h2><table>${diaRows}</table>` : ''}${fases.length ? `<h2>Fases del proyecto</h2><table>${faseRows}</table>` : ''}<h2>Desarrollo de la sesión</h2><table>${fieldRows([{key:'problematica_sesion',label:'Problemática de la sesión'},{key:'fase',label:'Fase'},{key:'contenido_sesion',label:'Contenido de la sesión'},{key:'pda_sesion',label:'PDA de la sesión'},{key:'ejes_sesion',label:'Ejes articuladores de la sesión'},{key:'fase_metodologia',label:'Fase de la metodología'},{key:'momento_metodologia',label:'Momento de la metodología'},{key:'materiales',label:'Materiales'},{key:'actividad_inicial',label:'Actividad inicial'},{key:'pregunta_detonadora',label:'Pregunta detonadora'},{key:'actividad_desarrollo',label:'Actividad de desarrollo'},{key:'cierre_actividad',label:'Cierre de la actividad'}])}</table><h2>Evaluación, observaciones y adecuaciones</h2><table>${fieldRows([{key:'que_evaluar',label:'¿Qué evaluar?'},{key:'como_evaluar',label:'¿Cómo evaluar?'},{key:'con_que_evaluar',label:'¿Con qué evaluar?'},{key:'dominio_contenidos',label:'Dominio de contenidos'},{key:'observaciones',label:'Observaciones generales'},{key:'adecuaciones_curriculares',label:'Adecuaciones curriculares'},{key:'recursos',label:'Recursos'},{key:'evaluacion_general',label:'Evaluación general'},{key:'adecuaciones_generales',label:'Adecuaciones'}])}</table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(nombre || 'Plano didactico').replace(/[<>:"/\\|?*]+/g, '-').trim() || 'Plano didactico'}.doc`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
