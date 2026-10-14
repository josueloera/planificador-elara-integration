import { generateCompletion } from '../services/aiService';
import { handleTeacherRequest, requestsFullForm } from '../services/teacherAdvisor';
import React, { useState, useEffect, useRef } from 'react';
import './ClippyAssistant.css';
import { EVENTO_PREFERENCIAS_ELARA, leerPreferenciasElara, guardarPreferenciasElara } from '../elaraPreferences';
import { getLocalResponse, getRandomTip } from './assistantRules';
import {
  buildChatTools,
  buildGeminiContents,
  buildGeminiTools,
  buildSystemPrompt,
  callGeminiGenerateContent
} from '../services/geminiChatService';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;


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
  const [preferencias, setPreferencias] = useState(leerPreferenciasElara);
  const ocultarElara = () => guardarPreferenciasElara({ ...preferencias, visible: false });
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

  useEffect(() => {
    const actualizar = () => setPreferencias(leerPreferenciasElara());
    window.addEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  useEffect(() => {
    if (preferencias.visible) return;
    setIsOpen(false);
    setTooltip('');
    isDragging.current = false;
    currentAudioRef.current?.pause();
    recognitionRef.current?.abort();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false);
  }, [preferencias.visible]);

  // Los consejos se detienen al abrir el chat, ocultar ELARA o desactivarlos.
  useEffect(() => {
    setTooltip('');
    if (isOpen || !preferencias.visible || !preferencias.consejos) return;
    let timeout;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setTooltip(getRandomTip());
        timeout = setTimeout(() => setTooltip(''), 5000);
      }
    }, 45000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isOpen, preferencias.visible, preferencias.consejos]);

  const toggleMic = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = event => inputRef.current?.appendValue(event.results[0][0].transcript);
    recognition.onerror = error => { console.error("Error de reconocimiento de voz:", error); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition; recognition.start();
  };

  // Text-To-Speech (TTS)
  const speakText = async (text) => {
    if (isMuted || !leerPreferenciasElara().visible) return;
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

    // Voz local del dispositivo.
    // 2. Fallback: usar la síntesis local edge-tts
    if (ipcRenderer) {
      try {
        const audioUrl = await ipcRenderer.invoke('elara-speak', cleanText);
        if (!leerPreferenciasElara().visible) return;
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
      if (!leerPreferenciasElara().visible) return;
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

  const getGeminiResponse = async (userText, chatHistory) => {
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

      const systemPrompt = buildSystemPrompt(contextStr, 'primaria');
      const contents = buildGeminiContents(chatHistory, userText);
      const geminiTools = buildGeminiTools(buildChatTools('primaria'));

      let keepGoing = true;
      let loopCount = 0;
      let finalMessage = null;

      while (keepGoing && loopCount < 5) {
        loopCount++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        let data;
        try {
          data = await callGeminiGenerateContent({
            contents: contents,
            tools: geminiTools,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.7
            }
          }, controller.signal);
        } finally {
          clearTimeout(timeoutId);
        }
        const candidate = data.candidates?.[0];
        if (!candidate) break;

        const responseContent = candidate.content;
        const parts = responseContent?.parts || [];

        const textParts = parts.filter(p => p.text);
        if (textParts.length > 0) {
          finalMessage = textParts.map(p => p.text).join('\n');
        }

        const functionCalls = parts.filter(p => p.functionCall);
        if (functionCalls.length > 0) {
          contents.push(responseContent);

          const functionResponses = [];
          for (const call of functionCalls) {
            const toolCall = call.functionCall;
            const name = toolCall.name;
            const args = toolCall.args;
            let toolResult = "";
            try {
              if (name === 'generate_image') {
                const prompt = args.prompt;
                const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
                toolResult = `Imagen generada exitosamente con la URL: ${imageUrl}`;
                setMessages(prev => [...prev, { sender: 'bot', text: `¡Listo! He generado la imagen basada en tu descripción:`, imageUrl: imageUrl }]);
              }
              else if (name === 'execute_planner_javascript') {
                const code = args.javascript_code;
                const func = new Function('return (async () => { ' + code + ' })()');
                const result = await func();
                toolResult = typeof result === 'string' ? result : JSON.stringify(result);
              } 
              else if (name === 'fill_planner_form') {
                if (window.plannerContext && window.plannerContext.setPlanData) {
                  window.plannerContext.setPlanData(prev => ({ ...prev, ...args }));
                  toolResult = "Formulario de planeación semanal completado localmente.";
                } else {
                  toolResult = "Error: El formulario de planeación no está disponible.";
                }
              } 
              else if (name === 'fill_project_form') {
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
              else if (name === 'create_school_group') {
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

            functionResponses.push({
              functionResponse: {
                name: name,
                response: {
                  result: toolResult
                }
              }
            });
          }

          contents.push({
            role: 'user',
            parts: functionResponses
          });
        } else {
          keepGoing = false;
        }
      }

      return finalMessage || "Directriz procesada.";
    } catch (error) {
      console.error("Fallo la conexión a Gemini, usando modo local de ELARA:", error);
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

      if (['PLANNER', 'PROYECTOS'].includes(window.plannerContext?.vista) || requestsFullForm(userText)) {
        botResponse = await handleTeacherRequest({
          text: userText, history: currentChat, context: window.plannerContext,
          level: 'primaria', generate: args => generateCompletion({ ...args, advisor: true }), getContext: () => window.plannerContext
        });
      } else {
        botResponse = await handleTeacherRequest({ text: userText, history: currentChat, context: window.plannerContext, level: 'primaria', generate: args => generateCompletion({ ...args, advisor: true }), getContext: () => window.plannerContext });
      }

      if (!botResponse) {

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

      // Fallback estático si no actuó ningún parser ni Gemini devolvió respuesta
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

  if (!preferencias.visible) return null;

  return (
    <div className="clippy-container" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      {!isOpen && preferencias.consejos && tooltip && (
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
            <button type="button" onClick={ocultarElara} title="Ocultar icono y consejos de ELARA">Ocultar</button>
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

      <button type="button" className="elara-hide-button" onClick={ocultarElara}
        title="Ocultar ELARA. Puedes volver a mostrarla en Ajustes Ciclo."
        aria-label="Ocultar icono y consejos de ELARA">×</button>
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
