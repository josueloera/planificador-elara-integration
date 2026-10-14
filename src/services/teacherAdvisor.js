const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
export const WEEK_FIELDS = [...DAYS.flatMap(day => ['inicio', 'desarrollo', 'cierre'].map(part => `${day}_${part}`)), 'recursos', 'evaluacion', 'adecuaciones'];
const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const object = value => {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

export function requestsFullForm(text) {
  const t = normalize(text);
  if (/\b(no|nunca|sin)\s+(?:lo\s+|la\s+)?(?:llen|complet|gener|redact|modifi|cambi|reescri)/.test(t) || /\b(como|que significa|explica|aconseja|recomienda)\b/.test(t)) return false;
  return /\b(llena\w*|rellena\w*|completa\w*|genera\w*|redacta\w*|estructura\w*|haz|elabora\w*|crea\w*)\b/.test(t)
    && (/\b(tod[oa]\w*|completamente|entero|entera)\b/.test(t) || /(?:planeacion|planeaciones|plano didactico|proyecto|semana)/.test(t));
}

export function buildAdvisorContext(ctx, level, kind) {
  const source = kind === 'proyecto' ? ctx.proyectoActual : ctx.planData;
  const selected = kind === 'proyecto'
    ? (ctx.pdasDisponibles || []).filter(p => (ctx.proyectoActual?.pdas_seleccionados || []).some(id => String(id) === String(p.id)))
    : (ctx.pdasSemana || []);
  return {
    nivel: level, grado: ctx.grupoActual?.grado || ctx.grado,
    grupo: ctx.grupoActual ? { grado: ctx.grupoActual.grado, seccion: ctx.grupoActual.seccion, materia: ctx.grupoActual.nombre_disciplina } : null,
    campo: ctx.campoActual, semana: ctx.semanaPlan, fechas: ctx.fechasSemana,
    inicio_ciclo: ctx.configCiclo?.fechaInicioStr,
    pdas: selected.map(p => ({ contenido: p.contenido, pda: p.descripcion || p.pda, campo: p.campo, proyecto: p.proyecto_sugerido || p.proyecto })),
    documento: kind,
    datos: kind === 'proyecto'
      ? { nombre: source?.nombre, metodologia: source?.metodologia, escenario: source?.escenario, temporalidad: source?.temporalidad, problemática: source?.problemática, fases_contenido: object(source?.fases_contenido), apartados: object(source?.apartados) }
      : { ...Object.fromEntries(WEEK_FIELDS.map(key => [key, source?.[key] || ''])), apartados: object(source?.apartados) },
    fases: kind === 'proyecto' ? ctx.metodologias?.[source?.metodologia]?.fases || [] : [],
    campos_apartados: ctx.apartadosAsistente?.[kind] || []
  };
}

export function formTemplate(context) {
  const fields = Object.fromEntries(context.campos_apartados.map(field => [field.key, `Texto: ${field.label}`]));
  if (context.documento === 'proyecto') return {
    nombre: 'Nombre del proyecto', escenario: 'Escenario', temporalidad: 'Duración y sesiones', problemática: 'Problema contextualizado',
    fases_contenido: Object.fromEntries(context.fases.map((label, index) => [String(index), `Actividades para ${label}`])),
    ...(Object.keys(fields).length ? { apartados: fields } : {})
  };
  return { ...Object.fromEntries(WEEK_FIELDS.map(key => [key, 'Texto didáctico específico'])), ...(Object.keys(fields).length ? { apartados: { nombre_proyecto: 'Nombre del proyecto', ...fields } } : {}) };
}

export function validateForm(data, template, complete = true, path = '') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Formato inválido: ${path || 'formulario'}`);
  const clean = {};
  for (const [key, example] of Object.entries(template)) {
    if (!Object.hasOwn(data, key)) {
      if (complete) throw new Error(`Falta el apartado ${path}${key}`);
      continue;
    }
    if (typeof example === 'object') {
      clean[key] = validateForm(data[key], example, complete, `${path}${key}.`);
    } else {
      if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`Apartado vacío o inválido: ${path}${key}`);
      clean[key] = data[key].trim();
    }
  }
  if (!Object.keys(clean).length) throw new Error('La respuesta no incluye campos válidos para este formulario.');
  return clean;
}

export function mergeForm(source, patch) {
  return { ...source, ...patch,
    ...(patch.apartados ? { apartados: { ...object(source.apartados), ...patch.apartados } } : {}),
    ...(patch.fases_contenido ? { fases_contenido: { ...object(source.fases_contenido), ...patch.fases_contenido } } : {})
  };
}

export const TEACHER_PROMPT = `Eres ELARA, asesora pedagógica profesional de docentes de educación básica en México.
Responde en español claro, respetuoso y práctico. Comprende instrucciones naturales, tildes y errores de escritura; no exijas frases especiales.
Usa el nivel, grado, materia/campo, PDA seleccionados, tema, fechas, duración, metodología y contenido existente del contexto. Respeta las decisiones del docente y las restricciones que indique.
Diseña actividades específicas, viables y secuenciadas: propósito observable, consigna para alumnado, intervención docente, organización, tiempo orientativo, recursos accesibles, evidencia y retroalimentación. En cada día o fase distingue inicio, desarrollo y cierre; evita repetir actividades genéricas.
Alinea propósitos, contenidos, PDA, actividades y evaluación formativa. Incluye criterios observables, instrumentos utilizables, autoevaluación/coevaluación y apoyos inclusivos sin inventar diagnósticos de alumnos. Justifica los ejes articuladores pertinentes sin agregar todos por obligación.
Respeta las fases de la metodología que muestra el formulario. No cambies la metodología ni los PDA seleccionados. Usa los textos de PDA proporcionados: no inventes citas oficiales, códigos ni páginas de libros. Si faltan PDA, indica en el campo correspondiente que la propuesta requiere vinculación curricular; no la presentes como transcripción oficial.
No inventes datos de escuela, docente, alumnos, diagnósticos, resultados logrados ni fechas. Si falta información no esencial, formula una propuesta explícita para revisión; si falta el tema y no puede deducirse del documento/PDA, pregunta brevemente antes de completar.
Actúa como asesor: explica decisiones, ofrece mejoras concretas y responde preguntas de seguimiento. Una consulta, explicación o petición de sugerencias no autoriza cambiar el formulario. Para solicitudes de edición modifica solo lo pedido; al solicitar todos los apartados genera todos, incluidos los campos anidados y las actividades de todos los días/fases.
No afirmes que guardaste o exportaste datos. Tus propuestas se revisan en el formulario y el docente las guarda.
Devuelve únicamente un objeto JSON: {"accion":"asesorar" o "aplicar", "respuesta":"Respuesta útil al docente", "datos":{campos del formulario}}.
Usa accion asesorar para consultas o cuando necesites un dato imprescindible; datos debe ser {}. Usa aplicar solo si el docente solicita llenar o editar. No ejecutes código ni solicites herramientas.`;

function snapshot(ctx, kind) {
  return JSON.stringify([ctx.vista, ctx.modoEdicionProy, ctx.grupoActual?.id, ctx.grupoActual?.disciplina_id, ctx.grado, ctx.campoActual, ctx.semanaPlan, ctx.configCiclo, ctx.pdasSemana, kind === 'proyecto' ? ctx.proyectoActual : ctx.planData]);
}

export async function handleTeacherRequest({ text, history = [], context, level, generate, getContext }) {
  const kind = context?.vista === 'PROYECTOS' ? 'proyecto' : 'planeacion';
  const full = requestsFullForm(text);
  if (!context || !['PLANNER', 'PROYECTOS'].includes(context.vista)) {
    if (full) return 'Abre la planeación o el proyecto que deseas trabajar para que pueda usar su contexto y completar sus apartados.';
    try {
      const response = await generate({systemPrompt: TEACHER_PROMPT, userPrompt: JSON.stringify({solicitud:text, nivel:level, historial:history.slice(-10).map(m=>({rol:m.sender,texto:m.text})), instruccion:'Responde como asesor docente con accion asesorar y datos {}. No hay formulario abierto; no puedes modificar ni guardar información.'})});
      if (typeof response?.respuesta === 'string' && response.respuesta.trim()) return response.respuesta;
    } catch { /* Show an actionable connection error rather than a canned answer. */ }
    return 'No pude conectar con el servicio de IA. Comprueba tu conexión y vuelve a intentarlo.';
  }
  if (kind === 'proyecto' && (!context.modoEdicionProy || !context.proyectoActual)) return 'Abre un proyecto o crea uno nuevo para trabajar en sus apartados.';
  if (full && !context.grupoActual?.id) return 'Selecciona el grupo antes de llenar el formulario; así podré adaptar el contenido a su grado y materia.';
  const initial = snapshot(context, kind);
  const pedagogical = buildAdvisorContext(context, level, kind);
  const template = formTemplate(pedagogical);
  const prompt = JSON.stringify({
    contexto: pedagogical,
    historial: history.slice(-10).map(m => ({ rol: m.sender === 'user' ? 'docente' : 'asesor', texto: m.text })),
    solicitud: text, llenar_todo: full,
    formato_datos: template,
    instruccion: full ? 'Para aplicar, incluye TODOS los campos del formato_datos con contenido desarrollado, no sus descripciones. Si necesitas un dato esencial, pregunta con accion asesorar.' : 'Si es consulta responde con accion asesorar. Si solicita una edición puntual usa aplicar incluyendo solo los campos que deben cambiar.'
  });
  try {
    let response = await generate({ systemPrompt: TEACHER_PROMPT, userPrompt: prompt });
    if (response?.accion === 'asesorar' && typeof response.respuesta === 'string' && response.respuesta.trim()) return response.respuesta;
    let patch;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (response?.accion !== 'aplicar') throw new Error('La respuesta no indica una acción válida.');
        patch = validateForm(response.datos, template, full);
        break;
      } catch (error) {
        if (attempt) throw error;
        response = await generate({ systemPrompt: TEACHER_PROMPT, userPrompt: `${prompt}\nLa respuesta anterior no se pudo aplicar: ${error.message}. Devuelve el JSON corregido y completo.` });
      }
    }
    const current = getContext();
    if (!current?.grupoActual?.id) return 'Selecciona el grupo antes de aplicar contenido al formulario.';
    if (snapshot(current, kind) !== initial) return 'El documento o el grupo cambió durante la generación. No apliqué el contenido para evitar sobrescribir tus cambios; vuelve a solicitarlo en el formulario actual.';
    const setter = kind === 'proyecto' ? current.setProyectoActual : current.setPlanData;
    if (typeof setter !== 'function') throw new Error('El formulario no está disponible.');
    setter(prev => mergeForm(prev, patch));
    return `${full ? 'Completé todos los apartados y las actividades' : 'Apliqué los cambios solicitados'} en ${kind === 'proyecto' ? 'el proyecto' : 'la planeación'}. Revisa la propuesta y pulsa Guardar para conservarla.`;
  } catch {
    return 'No pude obtener una respuesta completa de la IA. El formulario conserva su contenido. Comprueba la conexión y vuelve a intentarlo; si persiste, revisa la configuración del servicio de IA.';
  }
}
