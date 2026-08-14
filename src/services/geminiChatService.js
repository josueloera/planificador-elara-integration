const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

export const getGeminiApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
};

export const getGeminiEndpoint = () => {
  const apiKey = getGeminiApiKey();
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
};

export const buildGeminiContents = (chatHistory, userText) => {
  const contents = [];
  chatHistory.filter(m => m.sender !== 'system').forEach(m => {
    const role = m.sender === 'user' ? 'user' : 'model';
    if (m.text) {
      contents.push({
        role: role,
        parts: [{ text: m.text }]
      });
    }
  });
  contents.push({
    role: 'user',
    parts: [{ text: userText }]
  });
  return contents;
};

export const buildGeminiTools = (tools) => {
  return [
    {
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      }))
    }
  ];
};

export const callGeminiGenerateContent = async (payload, signal) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  const url = getGeminiEndpoint();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: signal
  });
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorMsg}`);
  }
  return response.json();
};

export const buildSystemPrompt = (contextStr, nivel) => {
  const reglasNivel = nivel === 'secundaria'
    ? `REGLAS IMPORTANTES DE SECUNDARIA:
1. Ámbito de Secundaria: Esta app está estrictamente orientada a secundaria (grados 1 al 3, Fase 6 de la NEM). No uses grados de primaria (1 al 6).
2. Todo se asocia a un grupo: Si 'window.plannerContext.grupoActual' es nulo, no debes modificar ni guardar criterios, planeaciones ni proyectos. Debes avisar al usuario que seleccione un grupo en 'GRUPOS', o buscar si mencionó uno en el chat (ej. "2ºB", "1A"). Si lo mencionó, puedes escribir código para buscarlo asíncronamente con ipcRenderer.invoke('get-grupos') y seleccionarlo usando setGrupoActual(grupo) antes de continuar.
3. Para persistir datos en SQLite, evita registros huérfanos con valor grupo_id = NULL. Pasa siempre el grupo_id del grupo seleccionado.
4. Para realizar acciones en la pantalla o la base de datos, usa la función "execute_planner_javascript".`
    : `REGLAS IMPORTANTES DE PRIMARIA:
1. Ámbito de Primaria: Esta app está estrictamente orientada a primaria (grados 1 al 6). No uses grados de secundaria (grados 1-3 de Fase 6).
2. Todo se asocia a un grupo: Si 'window.plannerContext.grupoActual' es nulo, no debes modificar ni guardar criterios, planeaciones ni proyectos. Debes avisar al usuario que seleccione un grupo en 'GRUPOS', o buscar si mencionó uno en el chat (ej. "3ºB", "1A"). Si lo mencionó, puedes escribir código para buscarlo asíncronamente con ipcRenderer.invoke('get-grupos') y seleccionarlo usando setGrupoActual(grupo) antes de continuar.
3. Para persistir datos en SQLite, evita registros huérfanos con valor grupo_id = NULL. Pasa siempre el grupo_id del grupo seleccionado.
4. Para realizar acciones en la pantalla o la base de datos, usa la función "execute_planner_javascript".`;

  const ambito = nivel === 'secundaria' ? 'de secundaria' : 'de primaria';

  return `Eres el asistente pedagógico oficial del planificador escolar ${ambito}.
Tu función principal es asesorar y guiar al cuerpo docente en la formulación, redacción y estructuración de proyectos y planeaciones didácticas en el marco de la Nueva Escuela Mexicana (NEM).

Contexto actual de su pantalla en el planificador: ${contextStr}.
Tienes ACCESO TOTAL al planificador a través del código JavaScript manipulando 'window.plannerContext'.
${reglasNivel}
LÓGICA DISPONIBLE EN 'window.plannerContext':
- 'vista': Vista activa (ej. 'GRUPOS', 'MENU', 'EVAL', 'PLANNER', 'PROYECTOS', 'BITACORA'). Cambia con setVista(nombre).
- 'grupoActual': Grupo seleccionado. Establece con setGrupoActual(grupoObj).
- 'criterios': Criterios de evaluación. Establece con setCriterios(criteriosArray).
- 'guardarConfig(criterios, grupoId)': Guarda criterios. Llama con guardarConfig(criterios, grupoId) de forma explícita.
- 'savePlan()': Guarda la planeación actual (semanaPlan y planData).
- 'ipcRenderer': Acceso directo a IPC de Electron para consultar DB (ej. invoke('get-grupos'), invoke('add-grupo', g), invoke('get-disciplinas')).

Ejemplo para asignar criterios al grupo actual (asistencia 10% y examen 90%):
\`\`\`javascript
const ctx = window.plannerContext;
if (!ctx.grupoActual) {
  return "Error: Por favor, selecciona primero un grupo en la pantalla principal para poder asignar los criterios.";
}
const criterios = [
  { nombre: "Asistencia", porcentaje: 10 },
  { nombre: "Examen", porcentaje: 90 }
];
ctx.setCriterios(criterios);
ctx.guardarConfig(criterios, ctx.grupoActual.id);
return "Criterios configurados para el grupo: Asistencia 10% y Examen 90%.";
\`\`\`

Ejemplo para auto-seleccionar un grupo por texto (ej. "3ºA") si está nulo y guardar criterios:
\`\`\`javascript
const ctx = window.plannerContext;
const grupos = await ctx.ipcRenderer.invoke('get-grupos');
const found = grupos.find(g => g.grado === 3 && g.seccion === 'A');
if (!found) return "Error: No se encontró el grupo 3ºA en la base de datos.";
const disciplinas = await ctx.ipcRenderer.invoke('get-disciplinas');
const discName = disciplinas.find(d => d.id === found.disciplina_id)?.nombre || 'Desconocida';
const fullGrupo = { ...found, nombre_disciplina: discName };
ctx.setGrupoActual(fullGrupo);
ctx.setGrado(fullGrupo.grado);
const criterios = [{ nombre: "Asistencia", porcentaje: 10 }, { nombre: "Examen", porcentaje: 90 }];
ctx.setCriterios(criterios);
ctx.guardarConfig(criterios, fullGrupo.id);
return "Se seleccionó el grupo 3ºA y se configuraron sus criterios: Asistencia 10% y Examen 90%.";
\`\`\`

Cuando uses "execute_planner_javascript", el código se ejecuta en un contexto asíncrono y debes retornar una cadena describiendo lo que hiciste.
Mantén siempre una personalidad inteligente, analítica, empática y de alta tecnología.`;
};

export const buildChatTools = (nivel) => {
  const gradosEnum = nivel === 'secundaria' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
  const gradoDesc = nivel === 'secundaria' ? 'Grado escolar de secundaria (1 al 3).' : 'Grado escolar (1 al 6).';

  return [
    {
      type: "function",
      function: {
        name: "generate_image",
        description: "Genera una ilustración, imagen o dibujo educativo, artístico o descriptivo basado en el prompt detallado del usuario.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "El prompt detallado y descriptivo en inglés para generar la imagen, especificando estilo, colores y elementos." }
          },
          required: ["prompt"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "execute_planner_javascript",
        description: "Ejecuta código JavaScript arbitrario para manipular directamente el planificador docente y sus estados en la ventana de la aplicación. Usa 'window.plannerContext' para acceder a todos los estados y métodos.",
        parameters: {
          type: "object",
          properties: {
            javascript_code: { type: "string", description: "El código JavaScript a ejecutar. Debe ser autónomo y retornar una cadena o valor explicativo." }
          },
          required: ["javascript_code"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "fill_planner_form",
        description: "Llena el formulario de planeación semanal (usar solo si vista_actual es PLANNER).",
        parameters: {
          type: "object",
          properties: {
            lunes_inicio: { type: "string" }, lunes_desarrollo: { type: "string" }, lunes_cierre: { type: "string" },
            martes_inicio: { type: "string" }, martes_desarrollo: { type: "string" }, martes_cierre: { type: "string" },
            miercoles_inicio: { type: "string" }, miercoles_desarrollo: { type: "string" }, miercoles_cierre: { type: "string" },
            jueves_inicio: { type: "string" }, jueves_desarrollo: { type: "string" }, jueves_cierre: { type: "string" },
            viernes_inicio: { type: "string" }, viernes_desarrollo: { type: "string" }, viernes_cierre: { type: "string" },
            recursos: { type: "string" }, evaluacion: { type: "string" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "fill_project_form",
        description: "Llena el formulario del proyecto didáctico (usar solo si vista_actual es PROYECTOS).",
        parameters: {
          type: "object",
          properties: {
            fase_0: { type: "string", description: "Contenido de la Fase 1 o inicio del proyecto." },
            fase_1: { type: "string", description: "Contenido de la Fase 2." },
            fase_2: { type: "string", description: "Contenido de la Fase 3." },
            fase_3: { type: "string", description: "Contenido de la Fase 4." },
            fase_4: { type: "string", description: "Contenido de la Fase 5." },
            fase_5: { type: "string", description: "Contenido de la Fase 6 (si aplica)." }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_school_group",
        description: "Crea un nuevo grupo o asignatura en el planificador docente (SQLite).",
        parameters: {
          type: "object",
          properties: {
            grado: { type: "integer", enum: gradosEnum, description: gradoDesc },
            seccion: { type: "string", maxLength: 1, description: "Letra/sección del grupo (ej: A, B, C)." },
            disciplina_nombre: { type: "string", description: "Nombre de la materia o asignatura (ej: Español, Lengua, Matemáticas, Ciencias, Geografía, Historia, etc.)." },
            tipo: { type: "string", enum: ["Materia Regular", "Grupo Asesorado", "Taller"], description: "Tipo de grupo escolar." },
            ciclo_escolar: { type: "string", description: "Ciclo escolar activo (ej: 2025-2026)." }
          },
          required: ["grado", "seccion", "disciplina_nombre", "tipo"]
        }
      }
    }
  ];
};
