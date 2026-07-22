import React, { useState, useEffect, useRef } from 'react';
import './ClippyAssistant.css';
import { getLocalResponse, getRandomTip } from './assistantRules';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// =====================================================================
// ⚠️ ATENCIÓN: PEGA TU API KEY DE OPENAI AQUÍ ADENTRO DE LAS COMILLAS
// =====================================================================
const MI_OPENAI_API_KEY = window.openaiApiKey || ""; 

const ChatInput = React.memo(React.forwardRef(({ onSend, isTyping }, ref) => {
  const [value, setValue] = useState('');
  
  React.useImperativeHandle(ref, () => ({
    appendValue: (text) => {
      setValue(prev => (prev ? prev + ' ' : '') + text);
    },
    focus: () => {
      inputElRef.current?.focus();
    }
  }));

  const inputElRef = React.useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <form className="clippy-input-area" onSubmit={handleSubmit}>
      <input 
        ref={inputElRef}
        type="text" 
        placeholder="Escribe una directriz a ELARA..." 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isTyping}
      />
      <button type="submit" disabled={isTyping || !value.trim()}>➤</button>
    </form>
  );
}));

const ClippyAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('elara_muted') === 'true');
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('elara_muted', String(newMuted));
  };
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy ELARA, tu Asistente Pedagógica de la NEM. Estoy configurada de manera privada en tu equipo para asistirte en planeaciones, gestión de proyectos y evaluación formativa. ¿Qué deseas planificar hoy?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [tooltip, setTooltip] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Dragging logic
  const [pos, setPos] = useState({ x: window.innerWidth - 385, y: window.innerHeight - 585 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const wasDragged = useRef(false);
  const currentAudioRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Autofocus input when chat box is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Posición inicial segura en la esquina inferior derecha
  useEffect(() => {
    setPos({ x: window.innerWidth - 385, y: window.innerHeight - 585 });
    
    const handleGlobalPointerMove = (e) => {
      if (!isDragging.current) return;
      wasDragged.current = true;
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;
      
      // Boundaries (para contenedor de 350x550px)
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > window.innerWidth - 350) newX = window.innerWidth - 350;
      if (newY > window.innerHeight - 550) newY = window.innerHeight - 550;
      
      setPos({ x: newX, y: newY });
    };

    const handleGlobalPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  // Random tooltips de ELARA
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setTooltip(getRandomTip());
        setTimeout(() => setTooltip(''), 5000);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const toggleMic = async () => {
    const hasOpenAI = MI_OPENAI_API_KEY && MI_OPENAI_API_KEY.startsWith('sk-');

    if (hasOpenAI) {
      if (isListening) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsListening(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunksRef.current = [];
          
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());

            setIsTyping(true);
            try {
              const formData = new FormData();
              formData.append('file', audioBlob, 'speech.webm');
              formData.append('model', 'whisper-1');
              formData.append('language', 'es');

              const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
                },
                body: formData
              });

              if (!response.ok) throw new Error(`Whisper Error: ${response.status}`);
              const data = await response.json();
              if (data.text) {
                inputRef.current?.appendValue(data.text.trim());
              }
            } catch (err) {
              console.error("Error transcribiendo audio con Whisper:", err);
            } finally {
              setIsTyping(false);
            }
          };

          mediaRecorder.start();
          setIsListening(true);
        } catch (err) {
          console.error("Error al acceder al micrófono:", err);
          alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
        }
      }
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
        return;
      }

      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      } else {
        const rec = new SpeechRecognition();
        rec.lang = 'es-MX';
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          inputRef.current?.appendValue(text);
        };

        rec.onerror = (e) => {
          console.error("Error de reconocimiento de voz:", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      }
    }
  };

  // Text-To-Speech (TTS)
  const speakText = async (text) => {
    if (isMuted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Limpiar texto de caracteres especiales para lectura fluida
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
                          .replace(/\[.*?\]/g, "")
                          .replace(/[#*`_~➤]/g, "")
                          .trim();

    if (!cleanText) return;

    // 1. Intentar usar la API oficial de TTS de OpenAI (Voz Nova de alta calidad)
    if (MI_OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MI_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: 'nova'
          })
        });
        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          await audio.play();
          return;
        }
      } catch (err) {
        console.error("Error con OpenAI TTS, intentando local:", err);
      }
    }

    // 2. Fallback: usar la síntesis local edge-tts
    if (ipcRenderer) {
      try {
        const audioUrl = await ipcRenderer.invoke('elara-speak', cleanText);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        await audio.play();
        return;
      } catch (err) {
        console.error("Error al reproducir voz nativa de ELARA (edge-tts):", err);
      }
    }

    // 3. Fallback final: utilizar síntesis nativa del navegador si falla o no está en Electron
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-MX';
      const voices = window.speechSynthesis.getVoices();
      
      const esVoices = voices.filter(v => {
        const lang = v.lang.toLowerCase();
        return lang.includes('es-mx') || lang.includes('es-es') || lang.includes('es-us') || lang.startsWith('es');
      });
      
      let esVoice = esVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('sabina') || 
               name.includes('helena') || 
               name.includes('dalia') || 
               name.includes('maria') || 
               name.includes('google') || 
               name.includes('female');
      });
      
      if (!esVoice) {
        esVoice = esVoices.find(v => {
          const name = v.name.toLowerCase();
          return !name.includes('david') && !name.includes('raul') && !name.includes('pablo') && !name.includes('male');
        });
      }
      
      if (!esVoice && esVoices.length > 0) {
        esVoice = esVoices[0];
      }
      
      if (esVoice) utterance.voice = esVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'bot') {
        speakText(lastMsg.text);
      }
    }
  }, [messages]);

  const getOpenAIResponse = async (userText, chatHistory) => {
    try {
      const contextStr = window.plannerContext ? JSON.stringify({
        vista_actual: window.plannerContext.vista,
        pdas_activos: window.plannerContext.vista === 'PROYECTOS' ? window.plannerContext.proyectoActual?.pdas_seleccionados : window.plannerContext.pdasSemana,
        proyecto_actual_nombre: window.plannerContext.proyectoActual?.nombre,
        proyecto_actual_metodologia: window.plannerContext.proyectoActual?.metodologia,
        grupo_actual: window.plannerContext.grupoActual ? {
          id: window.plannerContext.grupoActual.id,
          grado: window.plannerContext.grupoActual.grado,
          seccion: window.plannerContext.grupoActual.seccion,
          disciplina_nombre: window.plannerContext.grupoActual.nombre_disciplina
        } : null
      }) : 'No hay contexto disponible.';

      const systemPrompt = `Eres ELARA (Epistemic Logic and Adaptive Relational Agent), el motor cognitivo de asistencia al docente.
Asistes en la Nueva Escuela Mexicana (NEM), monitorizas datos biométricos de salud (pasos diarios) y alarmas de celular en segundo plano.
Contexto actual de su pantalla en el planificador: ${contextStr}.
Tienes ACCESO TOTAL al planificador a través del código JavaScript manipulando 'window.plannerContext'.
REGLAS IMPORTANTES DE PRIMARIA:
1. Ámbito de Primaria: Esta app está estrictamente orientada a primaria (grados 1 al 6). No uses grados de secundaria (grados 1-3 de Fase 6).
2. Todo se asocia a un grupo: Si 'window.plannerContext.grupoActual' es nulo, no debes modificar ni guardar criterios, planeaciones ni proyectos. Debes avisar al usuario que seleccione un grupo en 'GRUPOS', o buscar si mencionó uno en el chat (ej. "3ºB", "1A"). Si lo mencionó, puedes escribir código para buscarlo asíncronamente con ipcRenderer.invoke('get-grupos') y seleccionarlo usando setGrupoActual(grupo) antes de continuar.
3. Para persistir datos en SQLite, evita registros huérfanos con valor grupo_id = NULL. Pasa siempre el grupo_id del grupo seleccionado.
4. Para realizar acciones en la pantalla o la base de datos, usa la función "execute_planner_javascript".
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

      let messagesToSend = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.filter(m => m.sender !== 'system').map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userText }
      ];

      const tools = [
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Genera una ilustración, imagen o dibujo educativo, artístico o descriptivo basado en el prompt detallado del usuario.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "El prompt detallado y descriptivo en inglés para DALL-E, especificando estilo, colores y elementos." }
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
                grado: { type: "integer", enum: [1, 2, 3, 4, 5, 6], description: "Grado escolar (1 al 6)." },
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

      let keepGoing = true;
      let loopCount = 0;
      let finalMessage = null;

      while (keepGoing && loopCount < 5) {
        loopCount++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let response;
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: messagesToSend,
              tools: tools,
              tool_choice: "auto",
              temperature: 0.7
            }),
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        const responseMessage = data.choices[0].message;

        if (responseMessage.content) {
          finalMessage = responseMessage.content;
        }

        if (responseMessage.tool_calls) {
          messagesToSend.push(responseMessage);

          for (const toolCall of responseMessage.tool_calls) {
            let toolResult = "";
            try {
              if (toolCall.function.name === 'generate_image') {
                const args = JSON.parse(toolCall.function.arguments);
                const prompt = args.prompt;
                const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: 'dall-e-3',
                    prompt: prompt,
                    n: 1,
                    size: '1024x1024'
                  })
                });
                if (dalleRes.ok) {
                  const dalleData = await dalleRes.json();
                  const url = dalleData.data[0].url;
                  toolResult = `Imagen generada exitosamente con la URL: ${url}`;
                  setMessages(prev => [...prev, { sender: 'bot', text: `¡Listo! He generado la imagen basada en tu descripción:`, imageUrl: url }]);
                } else {
                  const errText = await dalleRes.text();
                  toolResult = `Error al generar la imagen con DALL-E: ${errText}`;
                }
              }
              else if (toolCall.function.name === 'execute_planner_javascript') {
                const args = JSON.parse(toolCall.function.arguments);
                const code = args.javascript_code;
                const func = new Function('return (async () => { ' + code + ' })()');
                const result = await func();
                toolResult = typeof result === 'string' ? result : JSON.stringify(result);
              } 
              else if (toolCall.function.name === 'fill_planner_form') {
                const args = JSON.parse(toolCall.function.arguments);
                if (window.plannerContext && window.plannerContext.setPlanData) {
                  window.plannerContext.setPlanData(prev => ({ ...prev, ...args }));
                  toolResult = "Formulario de planeación semanal completado localmente.";
                } else {
                  toolResult = "Error: El formulario de planeación no está disponible.";
                }
              } 
              else if (toolCall.function.name === 'fill_project_form') {
                const args = JSON.parse(toolCall.function.arguments);
                if (window.plannerContext && window.plannerContext.setProyectoActual) {
                  const nuevasFases = {};
                  if (args.fase_0) nuevasFases["0"] = args.fase_0;
                  if (args.fase_1) nuevasFases["1"] = args.fase_1;
                  if (args.fase_2) nuevasFases["2"] = args.fase_2;
                  if (args.fase_3) nuevasFases["3"] = args.fase_3;
                  if (args.fase_4) nuevasFases["4"] = args.fase_4;
                  if (args.fase_5) nuevasFases["5"] = args.fase_5;
                  
                  window.plannerContext.setProyectoActual(prev => {
                    const updatedFases = { ...prev.fases_contenido, ...nuevasFases };
                    return { ...prev, fases_contenido: updatedFases };
                  });
                  toolResult = "Formulario del proyecto didáctico completado localmente.";
                } else {
                  toolResult = "Error: El formulario del proyecto no está disponible.";
                }
              } 
              else if (toolCall.function.name === 'create_school_group') {
                const args = JSON.parse(toolCall.function.arguments);
                if (ipcRenderer) {
                  const disciplinasList = await ipcRenderer.invoke('get-disciplinas');
                  let matchingId = null;
                  if (args.disciplina_nombre) {
                    const searchName = args.disciplina_nombre.toLowerCase();
                    const matched = disciplinasList.find(d => 
                      d.nombre.toLowerCase().includes(searchName) || 
                      searchName.includes(d.nombre.toLowerCase())
                    );
                    if (matched) matchingId = matched.id;
                  }
                  const finalDisciplinaId = matchingId || 1;
                  const nuevoGrupo = {
                    grado: args.grado || 1,
                    seccion: (args.seccion || 'A').toUpperCase(),
                    disciplina_id: finalDisciplinaId,
                    tipo: args.tipo || "Materia Regular",
                    ciclo_escolar: args.ciclo_escolar || "2025-2026"
                  };
                  await ipcRenderer.invoke('add-grupo', nuevoGrupo);
                  
                  if (window.plannerContext && window.plannerContext.setVista) {
                    const current = window.plannerContext.vista;
                    window.plannerContext.setVista('MENU');
                    setTimeout(() => {
                      window.plannerContext.setVista(current);
                    }, 100);
                  }
                  toolResult = `Grupo ${args.grado}º${args.seccion.toUpperCase()} creado con éxito para la asignatura ${args.disciplina_nombre}.`;
                } else {
                  toolResult = "Error: IPC Renderer no disponible.";
                }
              }
            } catch (err) {
              toolResult = `Error al ejecutar la herramienta: ${err.message}`;
            }

            messagesToSend.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: toolResult
            });
          }
        } else {
          keepGoing = false;
        }
      }

      return finalMessage || "Directriz procesada.";
    } catch (error) {
      console.error("Fallo la conexión a OpenAI, usando modo local de ELARA:", error);
      return null;
    }
  };

  const handleSend = async (userText) => {
    const currentChat = [...messages];
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);

    try {
      let botResponse = null;
      let actedLocally = false;
      const lowerMsg = userText.toLowerCase();

      // 1. Intentar responder usando OpenAI si la clave está configurada
      const hasOpenAI = MI_OPENAI_API_KEY && MI_OPENAI_API_KEY.startsWith('sk-');
      if (hasOpenAI) {
        botResponse = await getOpenAIResponse(userText, currentChat);
      }

      // 2. Si OpenAI no está disponible o no devolvió respuesta, usar los parsers locales como fail-safe
      if (!botResponse) {

        // Fail-safe parser local para llenado de planeaciones ("llena la planeacion", etc.)
        if (!actedLocally && (lowerMsg.includes('llena') || lowerMsg.includes('gener') || lowerMsg.includes('crea') || lowerMsg.includes('completa') || lowerMsg.includes('rellena') || lowerMsg.includes('haz') || lowerMsg.includes('estructur')) && (lowerMsg.includes('planeac') || lowerMsg.includes('semana') || lowerMsg.includes('abierta') || lowerMsg.includes('clase'))) {
          const ctx = window.plannerContext;
          if (ctx) {
            const activePdas = (ctx.pdasSemana && ctx.pdasSemana.length > 0) ? ctx.pdasSemana : [{ proyecto: 'Fortalecimiento Académico NEM', pda: 'Desarrollo de pensamiento crítico, análisis de textos y convivencia armónica.' }];
            const pdaText = activePdas.map(p => p.pda).join(' ');
            const projText = activePdas.map(p => p.proyecto).join(' ');
            const gradoActual = ctx.grupoActual?.grado || ctx.grado || 3;
            const campoNombre = ctx.campoActual || 'Lenguajes';
            const sem = ctx.semanaPlan || 1;

            const planGenerado = {
              lunes_inicio: `Saludar a los alumnos de ${gradoActual}º Primaria y explorar conocimientos previos sobre ${projText.substring(0, 70)}... Mediante una lluvia de ideas contextualizada.`,
              lunes_desarrollo: `Presentar el problema orientador a la comunidad escolar. Lectura comentada y registro individual sobre: "${pdaText.substring(0, 90)}...". Organizar equipos de indagación.`,
              lunes_cierre: `Socializar en plenario las reflexiones iniciales y registrar los acuerdos del grupo en la bitácora o rotafolio.`,

              martes_inicio: `Retomar la pregunta detonadora del lunes y revisar los conceptos clave aprendidos.`,
              martes_desarrollo: `Actividad práctica guiada: análisis de información y elaboración de esquemas colaborativos basados en el PDA. Apoyar a los alumnos con dudas.`,
              martes_cierre: `Retroalimentación grupal rápida y síntesis en el pizarrón de las ideas principales.`,

              miercoles_inicio: `Presentación de la consigna del día para la elaboración del producto intermedio de la secuencia.`,
              miercoles_desarrollo: `Trabajo en pequeñas comunidades: redacción, cálculo o producción gráfica referente al contenido de la semana (${campoNombre}).`,
              miercoles_cierre: `Intercambio de borradores entre equipos para realizar coevaluación con sugerencias respetuosas.`,

              jueves_inicio: `Recibir los comentarios de mejora y planificar las correcciones del producto.`,
              jueves_desarrollo: `Perfeccionamiento del trabajo final individual o colectivo. Integración de evidencias en el portafolio de aula.`,
              jueves_cierre: `Exposición oral breve de los resultados por parte de los representantes de cada equipo.`,

              viernes_inicio: `Reflexión metacognitiva sobre los logros de la Semana ${sem}.`,
              viernes_desarrollo: `Presentación final comunitaria de los productos logrados y autoevaluación guiada.`,
              viernes_cierre: `Conclusión de la secuencia didáctica, registro pedagógico en bitácora e indicaciones para el siguiente proyecto.`,

              recursos: `Libros de texto gratuitos (NEM), cuaderno de trabajo, cartulinas, marcadores, pizarrón y materiales didácticos del aula.`,
              evaluacion: `Rúbrica formativa de observación, lista de cotejo de productos colectivos y participación reflexiva en plenario.`,
              adecuaciones: `Acompañamiento personalizado a estudiantes con áreas de oportunidad, apoyo visual en pizarrón y tiempos flexibles.`
            };

            if (ctx.setPlanData) {
              ctx.setPlanData(prev => ({ ...prev, ...planGenerado }));
            }
            if (ctx.savePlan) {
              setTimeout(() => ctx.savePlan(), 300);
            }

            botResponse = `¡Con gusto! He redactado y completado la planeación didáctica semanal (Lunes a Viernes) para la Semana ${sem} (${campoNombre} - ${gradoActual}º Primaria) directamente en tus campos de texto. Puedes revisarla y guardar los cambios.`;
            actedLocally = true;
          }
        }

        // Fail-safe parser local para llenado de proyectos ("llena el proyecto", "llena este proyecto", "llena el proyecto abierto", etc.)
        if (!actedLocally && (lowerMsg.includes('proyect') || lowerMsg.includes('fase')) && (lowerMsg.includes('llena') || lowerMsg.includes('gener') || lowerMsg.includes('crea') || lowerMsg.includes('completa') || lowerMsg.includes('rellena') || lowerMsg.includes('haz') || lowerMsg.includes('estructur') || lowerMsg.includes('redact') || lowerMsg.includes('abiert'))) {
          const ctx = window.plannerContext;
          if (ctx && ctx.proyectoActual) {
            const proj = ctx.proyectoActual;
            const met = proj.metodologia || 'SERVICIO';
            const nom = proj.nombre || 'Higiene para una vida saludable';
            const grad = ctx.grupoActual?.grado || ctx.grado || 3;

            let fasesGen = {};
            if (met === 'SERVICIO') { // De lo Humano (Servicio)
              fasesGen = {
                0: `1. PUNTO DE PARTIDA: Diálogo reflexivo en asamblea sobre "${nom}" en ${grad}º Primaria. Registrar los saberes previos y las necesidades detectadas en la escuela y el hogar.`,
                1: `2. ORGANIZACIÓN: Conformar equipos de trabajo, distribuir responsabilidades y coordinar las acciones comunitarias para investigar y abordar la problemática.`,
                2: `3. CREATIVIDAD: Elaborar productos informativos y prácticos (carteles, folletos, maquetas o trípticos) sobre "${nom}", promoviendo la participación activa de los alumnos.`,
                3: `4. EVALUACIÓN: Presentar el servicio o producto a la comunidad escolar. Coevaluación entre pares, autoevaluación reflexiva y establecimiento de compromisos permanentes.`
              };
            } else if (met === 'STEAM') { // Saberes (STEAM)
              fasesGen = {
                0: `1. INDAGACIÓN: Planteamiento de preguntas detonadoras e hipótesis científicas sobre "${nom}". Realizar observaciones guiadas y experimentos sencillos en el aula.`,
                1: `2. DISEÑO: Organizar la recolección de datos, elaborar tablas comparativas y diseñar modelos explicativos del fenómeno estudiado.`,
                2: `3. PROTOTIPADO: Construir prototipos o representaciones gráficas para comprobar las hipótesis y proponer soluciones a la problemática.`,
                3: `4. PRESENTACIÓN: Celebrar una feria de saberes en el aula. Exponer conclusiones, contrastar hipótesis iniciales y realizar autoevaluación formativa.`
              };
            } else if (met === 'ABP') { // Ética (ABP)
              fasesGen = {
                0: `1. PRESENTEMOS: Análisis crítico de casos situacionales y lectura de problemas comunitarios referentes a "${nom}". Dialogar sobre valores y responsabilidades.`,
                1: `2. RECOLECTEMOS: Investigación documental y entrevistas a miembros de la comunidad escolar para profundizar en las causas del problema.`,
                2: `3. PROBLEMA: Delimitar el problema central y proponer alternativas de solución ética, sustentable y pacífica.`,
                3: `4. EXPERIENCIA: Desarrollo de las actividades planificadas para poner a prueba las soluciones seleccionadas y documentar evidencias.`,
                4: `5. RESULTADOS: Socializar los resultados logrados, evaluar el impacto en la comunidad y establecer normas de convivencia armónica.`
              };
            } else { // COMUNITARIOS (Lenguajes)
              fasesGen = {
                0: `1. PLANEACIÓN: Negociar en comunidad el propósito y alcance del proyecto sobre "${nom}". Elaborar el plan de trabajo y asignar comisiones.`,
                1: `2. ACCIÓN: Búsqueda de información, entrevistas y redacción de borradores. Revisión en pequeños grupos, corrección ortográfica y gramatical.`,
                2: `3. INTERVENCIÓN: Presentación y difusión comunitaria de las producciones escritas (periódico mural, folletos o antología) con evaluación formativa.`
              };
            }

            const problematicaDefault = proj.problemática || `Deficiencia detectada en el entorno escolar y comunitario referente a ${nom}, requiriendo intervención pedagógica formativa.`;

            const updatedProj = {
              ...proj,
              problemática: problematicaDefault,
              fases_contenido: { ...(proj.fases_contenido || {}), ...fasesGen }
            };

            if (ctx.setProyectoActual) {
              ctx.setProyectoActual(updatedProj);
            }
            if (ctx.guardarProyectoSilencioso) {
              setTimeout(() => ctx.guardarProyectoSilencioso(updatedProj), 300);
            }

            botResponse = `¡Por supuesto! He redactado y completado automáticamente todas las fases del proyecto "${nom}" (${met} - ${grad}º Primaria) directamente en tus formularios y guardado los cambios.`;
            actedLocally = true;
          }
        }
        // Fail-safe parser local para creación de grupos/talleres
        if (lowerMsg.includes('crea') && (lowerMsg.includes('grupo') || lowerMsg.includes('materia') || lowerMsg.includes('taller') || lowerMsg.includes('clase') || lowerMsg.includes('asignatura'))) {
          let gradoLocal = 1;
          if (lowerMsg.includes('1') || lowerMsg.includes('primero')) gradoLocal = 1;
          else if (lowerMsg.includes('2') || lowerMsg.includes('segundo')) gradoLocal = 2;
          else if (lowerMsg.includes('3') || lowerMsg.includes('tercero')) gradoLocal = 3;
          else if (lowerMsg.includes('4') || lowerMsg.includes('cuarto')) gradoLocal = 4;
          else if (lowerMsg.includes('5') || lowerMsg.includes('quinto')) gradoLocal = 5;
          else if (lowerMsg.includes('6') || lowerMsg.includes('sexto')) gradoLocal = 6;
          
          let seccionLocal = 'A';
          const secMatch = lowerMsg.match(/(?:grupo|sección|seccion)\s*([a-f])/i) || lowerMsg.match(/\b([a-f])\b/i);
          if (secMatch) seccionLocal = secMatch[1].toUpperCase();
          
          let materiaNombre = 'Lenguajes';
          if (lowerMsg.includes('español') || lowerMsg.includes('lengua') || lowerMsg.includes('lenguajes')) materiaNombre = 'Lenguajes';
          else if (lowerMsg.includes('mate') || lowerMsg.includes('saberes') || lowerMsg.includes('ciencia')) materiaNombre = 'Saberes';
          else if (lowerMsg.includes('historia') || lowerMsg.includes('ética') || lowerMsg.includes('etica') || lowerMsg.includes('sociedad') || lowerMsg.includes('geografía') || lowerMsg.includes('geografia')) materiaNombre = 'Ética';
          else if (lowerMsg.includes('tutor') || lowerMsg.includes('asesor')) materiaNombre = 'Tutoría';
          
          if (ipcRenderer) {
            try {
              const disciplinasList = await ipcRenderer.invoke('get-disciplinas');
              let matchedD = disciplinasList.find(d => d.nombre.toLowerCase().includes(materiaNombre.toLowerCase()));
              const finalId = matchedD ? matchedD.id : 1;
              
              await ipcRenderer.invoke('add-grupo', {
                grado: gradoLocal,
                seccion: seccionLocal,
                disciplina_id: finalId,
                tipo: lowerMsg.includes('taller') ? 'Taller' : (lowerMsg.includes('asesor') ? 'Grupo Asesorado' : 'Materia Regular'),
                ciclo_escolar: '2025-2026'
              });
              
              botResponse = `¡Entendido! He creado localmente en SQLite el grupo de ${gradoLocal}º${seccionLocal} con la asignatura de ${matchedD?.nombre || 'Lenguajes'}.`;
              actedLocally = true;
              
              if (window.plannerContext && window.plannerContext.setVista) {
                const current = window.plannerContext.vista;
                window.plannerContext.setVista('MENU');
                setTimeout(() => {
                  window.plannerContext.setVista(current);
                }, 100);
              }
            } catch (err) {
              console.error("Error en creador de grupo local:", err);
            }
          }
        }

        // Fail-safe parser local para criterios de evaluación / rúbricas (asistencia 10%, etc.)
        if (!actedLocally && (lowerMsg.includes('criterio') || lowerMsg.includes('evalua') || lowerMsg.includes('%') || lowerMsg.includes('porcentaj'))) {
          const regex = /([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*(?:el|de|del)?\s*(\d+)\s*%/gi;
          let match;
          const criteriosLocales = [];
          let sumaPorcentaje = 0;
          
          while ((match = regex.exec(userText)) !== null) {
            let nombre = match[1].trim();
            nombre = nombre.replace(/\s+(?:el|del|de|y|al|la|los|las)$/i, '').trim();
            nombre = nombre.replace(/^[y\s,]+/, '').trim();
            const nombreCap = nombre.charAt(0).toUpperCase() + nombre.slice(1);
            const porcentaje = parseFloat(match[2]);
            if (nombreCap && !isNaN(porcentaje)) {
              criteriosLocales.push({ nombre: nombreCap, porcentaje });
              sumaPorcentaje += porcentaje;
            }
          }
          
          if (criteriosLocales.length > 0) {
            const ctx = window.plannerContext;
            if (ctx) {
              let activeGrupo = ctx.grupoActual;
              
              // Si no hay grupo activo, intentar detectar si el usuario mencionó uno en el mensaje
              if (!activeGrupo && ipcRenderer) {
                try {
                  const grupos = await ipcRenderer.invoke('get-grupos');
                  const matchGrupo = lowerMsg.match(/([123])\s*[º°]?[o°]?\s*([a-f])/i);
                  if (matchGrupo) {
                    const grad = parseInt(matchGrupo[1]);
                    const sec = matchGrupo[2].toUpperCase();
                    const found = grupos.find(g => g.grado === grad && g.seccion === sec);
                    if (found) {
                      const disciplinas = await ipcRenderer.invoke('get-disciplinas');
                      const discName = disciplinas.find(d => d.id === found.disciplina_id)?.nombre || 'Desconocida';
                      const fullGrupo = { ...found, nombre_disciplina: discName };
                      
                      ctx.setGrupoActual(fullGrupo);
                      ctx.setGrado(fullGrupo.grado);
                      localStorage.setItem('grado', fullGrupo.grado);
                      activeGrupo = fullGrupo;
                      if (ctx.showToast) {
                        ctx.showToast(`👥 Grupo ${fullGrupo.grado}º${fullGrupo.seccion} seleccionado automáticamente.`);
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error al buscar grupo por mensaje:", err);
                }
              }
              
              if (!activeGrupo) {
                botResponse = "Por favor, selecciona primero un grupo en la pantalla principal antes de asignar criterios, o dime para qué grupo (ej. '1ºA') quieres configurarlos.";
                actedLocally = true;
              } else if (ctx.setCriterios) {
                const criteriosConId = criteriosLocales.map((c, idx) => ({
                  ...c,
                  frontId: `temp-${ctx.campoActual || 'LENGUAJES'}-${Date.now()}-${idx}`
                }));
                ctx.setCriterios(criteriosConId);
                
                if (ctx.guardarConfig) {
                  ctx.guardarConfig(criteriosConId, activeGrupo.id);
                }
                
                botResponse = `¡Entendido! He configurado los criterios para el grupo de ${activeGrupo.grado}º${activeGrupo.seccion} (${activeGrupo.nombre_disciplina}): ${criteriosLocales.map(c => `${c.nombre} (${c.porcentaje}%)`).join(', ')}. Suma total: ${sumaPorcentaje}%.`;
                actedLocally = true;
              }
            }
          }
        }
      }

      // 3. Fallback estático si no actuó ningún parser ni OpenAI devolvió respuesta
      if (!botResponse && !actedLocally) {
        await new Promise(r => setTimeout(r, 600));
        botResponse = getLocalResponse(userText);
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (err) {
      console.error("Error en handleSend:", err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Lo siento, ocurrió un error inesperado al procesar la directiva." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    wasDragged.current = false;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handleAvatarClick = () => {
    if (!wasDragged.current) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="clippy-container" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      {!isOpen && tooltip && (
        <div className="clippy-tooltip" style={{ right: '80px', bottom: '15px' }}>
          {tooltip}
        </div>
      )}

      <div className={`clippy-chat-box ${isOpen ? 'open' : 'hidden'}`} style={{ position: 'absolute', bottom: '80px', right: '0' }}>
        <div className="clippy-header">
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src="./cutout_avatar.png" alt="ELARA" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} /> Asistente ELARA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button"
              onClick={toggleMute} 
              title={isMuted ? "Activar voz de ELARA" : "Silenciar voz de ELARA"}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button onClick={() => setIsOpen(false)}>✖</button>
          </div>
        </div>

        <div className="clippy-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`clippy-message ${msg.sender}`}>
              <div>{msg.text}</div>
              {msg.imageUrl && (
                <img 
                  src={msg.imageUrl} 
                  alt="Imagen generada" 
                  style={{ width: '100%', borderRadius: '12px', marginTop: '10px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer' }}
                  onClick={() => window.open(msg.imageUrl)}
                />
              )}
            </div>
          ))}
          {isTyping && <div className="clippy-message bot">Inferencia en curso... 🧬</div>}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput ref={inputRef} onSend={handleSend} isTyping={isTyping} />
      </div>

      <div 
        className={`elara-chat-avatar ${!isOpen ? 'bouncing' : ''}`}
        onPointerDown={handlePointerDown}
        onClick={handleAvatarClick}
        title="Arrastrar o hacer clic para abrir a ELARA"
      >
        <div className="elara-orb-core" style={{ overflow: "hidden", borderRadius: "50%" }}>
          <span className="elara-orb-pulse-ring"></span>
          <img src="./cutout_avatar.png" alt="ELARA" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
    </div>
  );
};

export default ClippyAssistant;
