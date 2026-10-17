import { exportHtmlPdf } from './documentExport';
const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const text = value => String(value ?? '').trim();
const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const multiline = value => escapeHtml(text(value)).replace(/\r?\n/g, '<br>');

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

const fieldRow = (label, value, options = {}) => {
  const { labelSpan = 1, valueSpan = 5, labelClass = '', valueClass = '' } = options;
  return `<tr class="keep"><th colspan="${labelSpan}" class="label ${labelClass}">${escapeHtml(label)}</th><td colspan="${valueSpan}" class="${valueClass}">${multiline(value)}</td></tr>`;
};

const sectionRow = title => `<tr class="keep"><th colspan="6" class="label section">${escapeHtml(title)}</th></tr>`;

const normalizeOptions = value => {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/[;,\n|]/).map(part => part.trim()).filter(Boolean);
};

const optionGrid = (options, selectedValue) => {
  const selected = normalizeOptions(selectedValue).map(normalized);
  const rows = options.length === 7 ? [options.slice(0, 4), options.slice(4)] : [options];
  return rows.map((row, rowIndex) => {
    const spans = options.length === 7
      ? rowIndex === 0 ? [1, 2, 1, 2] : [2, 2, 2]
      : options.length === 4 ? [2, 1, 1, 2] : Array(row.length).fill(Math.max(1, Math.floor(6 / row.length)));
    return `<tr class="options">${row.map((option, index) => {
      const isSelected = selected.includes(normalized(option)) || normalized(selectedValue).includes(normalized(option));
      return `<td colspan="${spans[index]}"><span class="check">${isSelected ? '☒' : '☐'}</span> ${escapeHtml(option)}</td>`;
    }).join('')}</tr>`;
  }).join('');
};

const optionCellsInline = (options, selectedValue) => {
  const selected = normalizeOptions(selectedValue).map(normalized);
  const whole = normalized(selectedValue);
  return options.map(option => {
    const isSelected = selected.includes(normalized(option)) || whole.includes(normalized(option));
    return `<td><span class="check">${isSelected ? '☒' : '☐'}</span> ${escapeHtml(option)}</td>`;
  }).join('');
};

const SCENARIOS = ['Comunitario', 'Escolar', 'Aula'];
const AXES = [
  'Inclusión',
  'Pensamiento crítico',
  'Interculturalidad crítica',
  'Igualdad de género',
  'Vida saludable',
  'Apropiación de las culturas a través de la lectura y la escritura',
  'Artes y experiencias estéticas'
];
const FIELDS = [
  'Lenguajes',
  'Saberes y pensamiento científico',
  'Ética, naturaleza y sociedades',
  'De lo humano y lo comunitario'
];
const METHODOLOGIES = [
  'Aprendizaje basado en proyectos comunitarios',
  'Aprendizaje basado en indagación (STEAM como enfoque)',
  'Aprendizaje basado en problemas (ABP)',
  'Aprendizaje servicio (AS)'
];

const selectedMethod = value => {
  const key = normalized(value);
  const match = METHODOLOGIES.find(item => key.includes(normalized(item).slice(0, 20)) || normalized(item).includes(key));
  if (match) return match;
  if (key.includes('comunit')) return METHODOLOGIES[0];
  if (key.includes('indag') || key.includes('steam')) return METHODOLOGIES[1];
  if (key.includes('problema')) return METHODOLOGIES[2];
  if (key.includes('servicio')) return METHODOLOGIES[3];
  return text(value);
};

const pdaRows = pdas => {
  const heading = sectionRow('Procesos de desarrollo de aprendizaje (PDA):');
  if (!pdas.length) return `${heading}${fieldRow('PDA:', '')}`;
  return heading + pdas.map(pda => {
    const field = pda.campo || pda.campo_formativo || 'Campo formativo';
    const project = pda.proyecto_sugerido || pda.proyecto || '';
    const content = pda.contenido || '';
    const description = pda.descripcion || pda.pda || '';
    const detail = [project && `<strong>${escapeHtml(project)}</strong>`, content && escapeHtml(content), description && escapeHtml(description)]
      .filter(Boolean).join('<br>');
    return `<tr class="keep"><th class="label">${escapeHtml(field)}</th><td colspan="5">${detail}</td></tr>`;
  }).join('');
};

const makeSession = ({ label, date, items, pdas, phases, extras, day }) => {
  const sessionFields = [
    ['Problemática:', items.problematica_sesion || items.descripcion_problematica || items.problematica || ''],
    ['Contenido:', items.contenido_sesion || items.contenidos || ''],
    ['PDA (proceso de desarrollo de aprendizaje):', items.pda_sesion || pdas.map(item => item.descripcion || item.pda).filter(Boolean).join('\n')],
    ['Fase:', items.fase || ''],
    ['Ejes articuladores:', items.ejes_sesion || items.ejes_articuladores || ''],
    ['Fase de la metodología:', items.fase_metodologia || ''],
    ['Momento de la metodología:', items.momento_metodologia || ''],
    ['Materiales:', items.materiales || extras.recursos || ''],
    ['Actividad inicial:', day?.inicio || items.actividad_inicial || ''],
    ['Pregunta detonadora:', items.pregunta_detonadora || ''],
    ['Actividad de desarrollo:', day?.desarrollo || items.actividad_desarrollo || ''],
    ['Cierre de la actividad:', day?.cierre || items.cierre_actividad || '']
  ];
  const rows = sessionFields.map(([key, value]) => fieldRow(key, value)).join('');
  const evalRows = [
    ['¿Qué evaluar?', items.que_evaluar || ''],
    ['¿Cómo evaluar?', items.como_evaluar || extras.evaluacion || ''],
    ['¿Con qué evaluar?', items.con_que_evaluar || '']
  ].map(([key, value]) => fieldRow(key, value, { labelClass: 'eval-label' })).join('');
  const methodRows = phases.map(phase => fieldRow(phase.label || 'Fase de la metodología:', phase.value || '')).join('');
  const dateLabel = date || day?.fecha || label || items.fecha || '';
  return `${sectionRow(dateLabel ? `Sesión: ${dateLabel}` : 'Desarrollo de la sesión')}` +
    rows +
    methodRows +
    `${sectionRow('Evaluación:')}${evalRows}` +
    fieldRow('Dominio de contenidos:', items.dominio_contenidos || '') +
    fieldRow('Observaciones generales:', items.observaciones || '') +
    fieldRow('Adecuaciones curriculares:', items.adecuaciones_curriculares || extras.adecuaciones || '');
};

export function buildPlanoDidacticoHtml({ tipo, nombre, datos = {}, apartados = {}, pdas = [], fases = [], dias = [], extras = {} } = {}) {
  const items = { ...(apartados || {}), recursos: extras.recursos ?? apartados?.recursos };
  const method = selectedMethod(items.metodologia || datos.metodologia || '');
  const title = text(nombre) || 'Sin nombre';
  const rawGrade = text(datos.grado);
  const grade = /^\d+$/.test(rawGrade) ? `${rawGrade}º` : rawGrade;
  const selectedAxes = items.ejes_articuladores || items.ejes_sesion || '';
  const selectedFields = items.campos_formativos || pdas.map(item => item.campo || item.campo_formativo).filter(Boolean);
  const sessionList = dias.length
    ? dias.map(day => makeSession({ label: day.label, date: day.fecha, items, pdas, phases: [], extras, day })).join('')
    : makeSession({ items, pdas, phases: fases, extras });

  const overview = [
    `<tr class="keep"><th class="label project-label">Nombre del proyecto:</th><td colspan="2" class="project-name">${escapeHtml(title)}</td>${optionCellsInline(SCENARIOS, items.escenario || datos.escenario)}</tr>`,
    `<tr class="keep"><th class="label">Fase:</th><td>${escapeHtml(items.fase || datos.fase || '')}</td><th class="label">Grado:</th><td>${escapeHtml(grade)}</td><th class="label">Temporalidad:</th><td>${escapeHtml(items.temporalidad || datos.temporalidad || '')}</td></tr>`,
    fieldRow('Propósito:', items.proposito || '' , { labelSpan: 1, valueSpan: 5 }),
    `<tr class="keep"><th colspan="6" class="label">Ejes articuladores:</th></tr>`,
    optionGrid(AXES, selectedAxes),
    `<tr class="keep"><th colspan="6" class="label">Campos formativos:</th></tr>`,
    optionGrid(FIELDS, selectedFields),
    fieldRow('Descripción de la problemática:', items.descripcion_problematica || datos.problematica || datos.problematica_sesion || '', { valueSpan: 5 }),
    fieldRow('Contenidos:', items.contenidos || '', { valueSpan: 5 }),
    pdaRows(pdas),
    `<tr class="keep"><th colspan="6" class="label">Metodología:</th></tr>`,
    optionGrid(METHODOLOGIES, method),
    fieldRow('Descripción de la metodología a desarrollar:', items.descripcion_metodologia || '', { valueSpan: 5 })
  ].join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page{size:letter portrait;margin:0.98in 1.18in}
*{box-sizing:border-box}body{font:9pt Arial,Helvetica,sans-serif;color:#111;margin:0}
h1{font-size:12pt;margin:0;padding:5pt;text-align:center;background:#ffc000;font-weight:700}
.plan{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 8pt}
.plan th,.plan td{border:1px solid #333;padding:4pt 5pt;vertical-align:top;overflow-wrap:anywhere;line-height:1.18}
.plan th.label{background:#ffc000;font-weight:700;text-align:left}.plan .section{text-align:left;font-size:9pt}
.plan .project-name{font-weight:700}.plan .options td{text-align:left;font-size:8pt;vertical-align:middle}.plan .check{font-size:10pt;white-space:nowrap}
.plan .eval-label{width:18%}.keep{page-break-inside:avoid;break-inside:avoid}
.small{font-size:8pt}.new-page{page-break-before:always;break-before:page}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.plan{page-break-inside:auto}.plan tr{page-break-inside:avoid;break-inside:avoid}}
</style></head><body><table class="plan"><colgroup><col style="width:19%"><col style="width:16%"><col style="width:16%"><col style="width:16%"><col style="width:16%"><col style="width:17%"></colgroup><tbody>
<tr><th colspan="6" class="label"><h1>Plano didáctico</h1></th></tr>
${overview}
${sessionList}
${extras.evaluacion && !items.como_evaluar ? fieldRow('Evaluación general:', extras.evaluacion) : ''}
${extras.recursos && !items.materiales ? fieldRow('Recursos:', extras.recursos) : ''}
</tbody></table></body></html>`;
  return html;
}

const makeFileName = nombre => `${text(nombre).replace(/[<>:"/\\|?*]+/g, '-').trim() || 'Plano didactico'}.doc`;

export function exportarPlanoWord(data) {
  const html = buildPlanoDidacticoHtml(data);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = makeFileName(data?.nombre);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarPlanoPdf(data) {
  try { return await exportHtmlPdf(buildPlanoDidacticoHtml(data), data?.nombre || 'Plano didáctico'); }
  catch (error) { window.alert('No se pudo exportar el PDF: ' + error.message); }
}
