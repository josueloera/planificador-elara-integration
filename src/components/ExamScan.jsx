import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateCompletion } from '../services/aiService';
import ExamScanReader from './ExamScanReader';

const choices = ['A', 'B', 'C', 'D'];
const emptyQuestion = () => ({ texto: '', opciones: { A: '', B: '', C: '', D: '' }, correcta: '', puntos: 1, imagen: '' });
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #cad5df', borderRadius: 7, font: 'inherit', background: 'white' };

function normalizeAiAnswer(answer, options) {
  if (typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < choices.length) return choices[answer];
  const value = String(answer ?? '').trim();
  if (!value) return '';
  const comparable = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const matchingOption = choices.find(letter => String(options[letter] || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase() === comparable);
  if (matchingOption) return matchingOption;
  const letter = comparable.match(/^(?:opcion|respuesta|correcta)?\s*([a-d])(?:\s*[).:,-]|\s|$)/);
  return letter ? letter[1].toUpperCase() : '';
}

export default function ExamScan({ edition = 'primaria', group, grade, cycle, evaluationDate, ipc, onBack, onResultSaved }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(group || null);
  const [selectedCycle, setSelectedCycle] = useState(group?.ciclo_escolar || cycle?.ciclo_escolar || '2026-2027');
  const [students, setStudents] = useState([]);
  const [fields, setFields] = useState([]);
  const [pdas, setPdas] = useState([]);
  const [fieldName, setFieldName] = useState('');
  const [selectedPda, setSelectedPda] = useState(null);
  const [trimestre, setTrimestre] = useState('1');
  const [tipoExamen, setTipoExamen] = useState('TRIMESTRAL');
  const [periodoNombre, setPeriodoNombre] = useState('');
  const [titulo, setTitulo] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [validated, setValidated] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const [criterios, setCriterios] = useState([]);
  const [criterioId, setCriterioId] = useState('');
  const [cantidadIa, setCantidadIa] = useState(10);
  const [generandoIa, setGenerandoIa] = useState(false);
  const [examToScan, setExamToScan] = useState(null);

  useEffect(() => { ipc.invoke('get-grupos').then(rows => {
    // Esta app es Primaria; el selector debe respetar el grado activo y no
    // mostrar registros antiguos de otros grados.
    const activeGrade = Number(group?.grado || grade || (edition === 'primaria' ? 3 : 1));
    const availableGroups = (rows || []).filter(row => Number(row.grado) === activeGrade);
    setGroups(availableGroups);
    setSelectedGroup(current => {
      const next = availableGroups.find(item => String(item.id) === String(current?.id))
        || availableGroups.find(item => String(item.seccion) === String(group?.seccion))
        || availableGroups[0] || null;
      if (next?.ciclo_escolar) setSelectedCycle(next.ciclo_escolar);
      return next;
    });
  }).catch(err => setError(err.message)); }, [ipc, grade, group?.id, group?.seccion]);

  useEffect(() => {
    if (!selectedGroup) { setStudents([]); return; }
    ipc.invoke('get-alumnos', selectedGroup.id).then(setStudents).catch(err => setError(err.message));
    ipc.invoke('examscan-list-exams', selectedGroup.id).then(setHistory).catch(err => setError(err.message));
  }, [ipc, selectedGroup]);

  useEffect(() => {
    let active = true;
    setCriterios([]);
    setCriterioId('');
    if (!selectedGroup?.id || !fieldName) return () => { active = false; };
    ipc.invoke('get-criterios', selectedGroup.id, fieldName).then(rows => {
      if (!active) return;
      const scoped = rows || [];
      setCriterios(scoped);
      setCriterioId(current => scoped.some(item => String(item.id) === current)
        ? current
        : String(scoped.find(item => /examen/i.test(item.nombre))?.id || scoped[0]?.id || ''));
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [ipc, selectedGroup?.id, fieldName]);

  useEffect(() => {
    let active = true;
    Promise.all([ipc.invoke('get-campos-formativos'), ipc.invoke('get-pdas-disciplina', Number(selectedGroup?.disciplina_id || 0), Number(selectedGroup?.grado || grade || 1))])
      .then(([availableFields, availablePdas]) => {
        if (!active) return;
        setFields(availableFields || []); setPdas(availablePdas || []);
        setFieldName(current => current || availableFields?.[0]?.nombre || '');
      }).catch(err => setError(err.message));
    return () => { active = false; };
  }, [ipc, selectedGroup?.grado, grade]);

  const fieldPdas = useMemo(() => pdas.filter(item => item.campo === fieldName), [pdas, fieldName]);
  const contents = useMemo(() => [...new Set(fieldPdas.map(item => item.contenido).filter(Boolean))], [fieldPdas]);
  const [content, setContent] = useState('');
  const contentPdas = useMemo(() => fieldPdas.filter(item => item.contenido === content), [fieldPdas, content]);
  useEffect(() => { setContent(contents[0] || ''); setSelectedPda(null); }, [fieldName, contents.join('|')]);
  useEffect(() => { setSelectedPda(contentPdas[0] || null); }, [content, contentPdas.map(item => item.id).join('|')]);

  const updateQuestion = (index, update) => { setValidated(false); setQuestions(items => items.map((item, i) => i === index ? { ...item, ...update } : item)); };
  const updateOption = (index, letter, value) => { setValidated(false); setQuestions(items => items.map((item, i) => i === index ? { ...item, opciones: { ...item.opciones, [letter]: value } } : item)); };
  const attachQuestionImage = async (index, file) => {
    if (!file) return;
    setError('');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Usa una imagen JPG, PNG o WebP.');
      if (file.size > 12 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 12 MB antes de optimizarla.');
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('El archivo no se pudo abrir como imagen.'));
        element.src = source;
      });
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const optimized = canvas.toDataURL('image/jpeg', 0.82);
      if (optimized.length > 1_500_000) throw new Error('La imagen optimizada aún es demasiado grande; usa una imagen más pequeña.');
      const otherImages = questions.reduce((total, question, questionIndex) => total + (questionIndex === index ? 0 : question.imagen?.length || 0), 0);
      if (otherImages + optimized.length > 8_000_000) throw new Error('El conjunto de imágenes del examen supera el tamaño permitido. Reduce o quita algunas imágenes.');
      updateQuestion(index, { imagen: optimized });
    } catch (err) { setError(err.message || 'No se pudo agregar la imagen.'); }
  };
  const generateWithAi = async () => {
    setError(''); setNotice(''); setGenerandoIa(true);
    try {
      if (tipoExamen === 'PARCIAL' && !periodoNombre.trim()) throw new Error('Escribe el periodo, unidad o bloque del examen parcial.');
      const systemPrompt = `Eres especialista en evaluación formativa de ${edition} en México y la Nueva Escuela Mexicana. Responde únicamente JSON válido con {"titulo":"...","preguntas":[{"pregunta":"...","opciones":{"A":"...","B":"...","C":"...","D":"..."},"respuesta_correcta":"A","puntos":1}]}. Incluye exactamente la cantidad solicitada. Es obligatorio indicar en respuesta_correcta una sola letra entre A, B, C o D en cada reactivo y esa opción debe ser inequívocamente la correcta. Cada reactivo debe tener una sola respuesta correcta, distractores plausibles y lenguaje apropiado para el grado. No inventes imágenes.`;
      const modalidad = tipoExamen === 'PARCIAL' ? `examen parcial del periodo ${periodoNombre}` : `examen trimestral del trimestre ${trimestre}`;
      const userPrompt = `Crea un ${modalidad} de ${cantidadIa} reactivos para ${selectedGroup?.grado}º de ${edition}, grupo ${selectedGroup?.seccion}. Campo formativo: ${fieldName}. Contenido: ${selectedPda?.contenido || content}. PDA: ${selectedPda?.pda || ''}. Basa cada reactivo en el aprendizaje indicado, evita repetir preguntas y distribuye las respuestas correctas entre A, B, C y D.`;
      const generated = await generateCompletion({ systemPrompt, userPrompt, jsonMode: true, advisor: true, timeoutMs: 30000 });
      const parsed = Array.isArray(generated?.preguntas) ? generated.preguntas : [];
      if (parsed.length !== Number(cantidadIa)) throw new Error('La respuesta de IA no incluyó la cantidad de reactivos solicitada. Intenta de nuevo.');
      const normalized = parsed.map(item => {
        const rawOptions = item.opciones;
        const options = Array.isArray(rawOptions)
          ? Object.fromEntries(choices.map((letter, index) => [letter, String(rawOptions[index] || '').replace(new RegExp(`^${letter}[).:]\\s*`, 'i'), '')]))
          : Object.fromEntries(choices.map(letter => [letter, String(rawOptions?.[letter] || '')]));
        const answer = item.respuesta_correcta ?? item.correcta ?? item.clave ?? '';
        const correct = normalizeAiAnswer(answer, options);
        return { ...emptyQuestion(), texto: String(item.pregunta || item.texto || '').trim(), opciones: options, correcta: choices.includes(correct) ? correct : '', puntos: Number(item.puntos) > 0 ? Number(item.puntos) : 1 };
      });
      if (normalized.some(question => !question.correcta)) {
        const keySystemPrompt = 'Eres docente experto. Para cada reactivo, determina cuál de las opciones es correcta. No cambies ni reescribas preguntas u opciones. Responde solo JSON válido con la forma {"respuestas":["A","B","C","D"]}, una letra por reactivo y en el mismo orden. Si un reactivo es ambiguo, elige la opción más defendible según el contenido.';
        const keyUserPrompt = `Asigna la clave de respuestas a estos reactivos sin cambiar su contenido. Devuelve exactamente ${normalized.length} letras en el mismo orden: ${JSON.stringify(normalized.map(question => ({ pregunta: question.texto, opciones: question.opciones })))}`;
        const keyGenerated = await generateCompletion({ systemPrompt: keySystemPrompt, userPrompt: keyUserPrompt, jsonMode: true, advisor: true, timeoutMs: 30000 });
        const keys = Array.isArray(keyGenerated?.respuestas) ? keyGenerated.respuestas : Array.isArray(keyGenerated?.clave_respuestas) ? keyGenerated.clave_respuestas : [];
        normalized.forEach((question, index) => {
          if (!question.correcta) question.correcta = normalizeAiAnswer(keys[index], question.opciones);
        });
        if (normalized.some(question => !question.correcta)) throw new Error('La IA no pudo asignar una clave válida a todos los reactivos. Intenta generar el borrador nuevamente.');
      }
      setTitulo(String(generated.titulo || `Examen · ${fieldName}`).trim());
      setQuestions(normalized); setResult(null); setValidated(false);
      setNotice('Borrador generado con IA y clave de respuestas marcada automáticamente. Revisa cada reactivo y confirma la clave antes de guardar; puedes agregar una imagen a cualquier pregunta.');
    } catch (err) { setError(err.message || 'No se pudo generar el examen con IA.'); }
    finally { setGenerandoIa(false); }
  };
  const reuseQuestions = async exam => {
    try {
      const saved = await ipc.invoke('examscan-load-questions', exam.id);
      setResult(null); setValidated(false); setQuestions(saved.preguntas); setTitulo(`${saved.titulo} (nueva aplicación)`);
      setTipoExamen(exam.tipo_examen || 'TRIMESTRAL'); setPeriodoNombre(exam.periodo_nombre || ''); setTrimestre(String(exam.trimestre || 1));
      setNotice('Preguntas copiadas del banco. Revisa que correspondan al campo, contenido y PDA seleccionados; vuelve a validar la clave antes de guardar.');
      setError(''); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err.message || 'No se pudieron recuperar las preguntas.'); }
  };
  const createExam = async () => {
    setError(''); setBusy(true);
    try {
      const exam = await ipc.invoke('examscan-create-exam', {
        grupo_id: selectedGroup.id, grado: selectedGroup.grado, seccion: selectedGroup.seccion,
        ciclo_escolar: selectedCycle || selectedGroup.ciclo_escolar || cycle?.ciclo_escolar || '2026-2027', trimestre,
        campo_formativo: fieldName, contenido: selectedPda?.contenido || content,
        pda: selectedPda?.pda || '', titulo, preguntas: questions, criterio_id: Number(criterioId), fecha_evaluacion: evaluationDate,
        tipo_examen: tipoExamen, periodo_nombre: periodoNombre
      });
      let evaluatorLinked = false;
      try {
        await ipc.invoke('configurar-evaluacion-automatica', { grupo_id: selectedGroup.id, tipo: 'examenes', criterio_ids: [Number(criterioId)], escala: 10 });
        evaluatorLinked = true;
      } catch (linkError) {
        setError(`El examen se guardó, pero no se pudo activar el vínculo automático del evaluador: ${linkError.message}. Usa “Vincular Exámenes al evaluador” al volver a Captura QR.`);
      }
      setResult({ ...exam, evaluatorLinked });
      ipc.invoke('examscan-list-exams', selectedGroup.id).then(setHistory);
    } catch (err) { setError(err.message || 'No se pudo guardar el examen.'); }
    finally { setBusy(false); }
  };

  const card = { background: 'white', border: '1px solid #e1e8ee', borderRadius: 12, padding: 18, margin: '14px 0', boxShadow: '0 2px 8px #17324d0b' };
  const button = { background: '#147768', color: 'white', border: 0, borderRadius: 8, padding: '10px 15px', cursor: 'pointer', fontWeight: 700 };

  return <main className="examscan-screen" style={{ maxWidth: 1050, margin: '0 auto', padding: '20px 24px 50px', color: '#172b42', fontFamily: 'inherit' }}>
    <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div><div style={{ color: '#147768', fontWeight: 800, letterSpacing: 1 }}>ELARA · EXAMSCAN</div><h1 style={{ margin: '6px 0' }}>Exámenes trimestrales y parciales</h1><div>Diseña, valida y genera una copia con QR para cada alumno.</div></div>
      <button style={{ ...button, background: '#536273' }} onClick={onBack}>Volver</button>
    </div>
    {error && <div role="alert" style={{ ...card, borderColor: '#d55', color: '#9b2020' }}>{error}</div>}
    {notice && <div role="status" className="no-print" style={{ ...card, borderColor: '#80b8a8', color: '#28584d' }}>{notice}</div>}
    <section className="no-print" style={card}>
      <h2 style={{ marginTop: 0 }}>1. Datos del examen</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
        <label>Ciclo escolar<select style={inputStyle} value={selectedCycle} onChange={e => { setValidated(false); const nextCycle=e.target.value; setSelectedCycle(nextCycle); setSelectedGroup(groups.find(g => !g.ciclo_escolar || String(g.ciclo_escolar) === nextCycle) || null); }}>{[...new Set([...groups.map(g => g.ciclo_escolar).filter(Boolean), selectedCycle])].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Grado y grupo<select style={inputStyle} value={selectedGroup?.id || ''} onChange={e => { setValidated(false); const next=groups.find(g => String(g.id) === e.target.value) || null; setSelectedGroup(next); if (next?.ciclo_escolar) setSelectedCycle(next.ciclo_escolar); }}>{groups.filter(g => !g.ciclo_escolar || String(g.ciclo_escolar) === selectedCycle).map(g => <option key={g.id} value={g.id}>{g.grado}º {g.seccion} · {edition === 'primaria' ? 'Primaria' : 'Secundaria'}</option>)}</select></label>
        <label>Trimestre<select style={inputStyle} value={trimestre} onChange={e => { setValidated(false); setTrimestre(e.target.value); }}>{[1,2,3].map(n => <option key={n} value={n}>{n}º trimestre</option>)}</select></label>
        <label>Tipo de examen<select style={inputStyle} value={tipoExamen} onChange={e => { setValidated(false); setTipoExamen(e.target.value); if (e.target.value === 'TRIMESTRAL') setPeriodoNombre(''); }}><option value="TRIMESTRAL">Trimestral</option><option value="PARCIAL">Parcial</option></select></label>
        <label>Campo formativo<select style={inputStyle} value={fieldName} onChange={e => { setValidated(false); setFieldName(e.target.value); }}>{fields.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}</select></label>
      </div>
      {tipoExamen === 'PARCIAL' && <label style={{ display: 'block', marginTop: 12 }}>Periodo, unidad o bloque del parcial<input style={inputStyle} value={periodoNombre} onChange={e => { setValidated(false); setPeriodoNombre(e.target.value); }} placeholder="Ej. Unidad 2 · Fracciones" /></label>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 12 }}>
        <label>Contenido curricular<select style={inputStyle} value={content} onChange={e => { setValidated(false); setContent(e.target.value); }}>{contents.map((item, i) => <option key={i} value={item}>{item}</option>)}</select></label>
        <label>PDA<select style={inputStyle} value={selectedPda?.id || ''} onChange={e => { setValidated(false); setSelectedPda(contentPdas.find(item => String(item.id) === e.target.value) || null); }}>{contentPdas.map(item => <option key={item.id} value={item.id}>{item.pda}</option>)}</select></label>
      </div>
      <label style={{ display: 'block', marginTop: 12 }}>Criterio del evaluador<select style={inputStyle} value={criterioId} onChange={e => { setValidated(false); setCriterioId(e.target.value); }}><option value="">Selecciona un criterio</option>{criterios.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.porcentaje}% · {item.campo || 'Campo general'}</option>)}</select></label>
      {!criterios.length && <p role="status" style={{ color: '#92500a' }}>Configura primero un criterio para este grupo en Evaluación; después podrás vincular el examen.</p>}
      <label style={{ display: 'block', marginTop: 12 }}>Título del examen<input style={inputStyle} value={titulo} onChange={e => { setValidated(false); setTitulo(e.target.value); }} placeholder="Ej. Comprensión de textos informativos" /></label>
      <p style={{ marginBottom: 0, color: '#526476' }}>Alumnos inscritos en el grupo: <strong>{students.length}</strong></p>
    </section>
    <section className="no-print" style={card}>
      <h2 style={{ marginTop: 0 }}>2. Preguntas y clave de respuestas</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 10, padding: 12, marginBottom: 12, background: '#f3f7ff', border: '1px solid #dbe7fb', borderRadius: 9 }}>
        <label>Cantidad de reactivos<select style={{ ...inputStyle, width: 150 }} value={cantidadIa} onChange={e => setCantidadIa(Number(e.target.value))}>{[5,10,15,20].map(n => <option key={n} value={n}>{n} preguntas</option>)}</select></label>
        <button type="button" disabled={generandoIa || !selectedGroup || !selectedPda || (tipoExamen === 'PARCIAL' && !periodoNombre.trim())} style={{ ...button, background: '#315fb5', opacity: generandoIa || !selectedGroup || !selectedPda || (tipoExamen === 'PARCIAL' && !periodoNombre.trim()) ? .55 : 1 }} onClick={generateWithAi}>{generandoIa ? 'Generando…' : '✨ Crear borrador con IA'}</button>
        {!selectedGroup && <span>Selecciona un grupo con alumnos para habilitar la generación.</span>}
        {!selectedPda && <span>Selecciona campo, contenido y PDA para generar con contexto curricular.</span>}
      </div>
      {questions.map((q, index) => <article key={index} style={{ borderTop: '1px solid #e5ebf0', padding: '14px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Pregunta {index + 1}</strong>{questions.length > 1 && <button style={{ ...button, background: '#8b4750', padding: '5px 9px' }} onClick={() => { setValidated(false); setQuestions(items => items.filter((_, i) => i !== index)); }}>Quitar</button>}</div>
        <textarea aria-label={`Texto de pregunta ${index + 1}`} style={{ ...inputStyle, marginTop: 8, minHeight: 58 }} value={q.texto} onChange={e => updateQuestion(index, { texto: e.target.value })} placeholder="Escribe una pregunta basada en el PDA seleccionado" />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 }}><label style={{ ...button, background: '#526273', display: 'inline-block' }}>Agregar imagen al reactivo<input type="file" accept="image/*" aria-label={`Agregar imagen a pregunta ${index + 1}`} style={{ display: 'none' }} onChange={e => { attachQuestionImage(index, e.target.files?.[0]); e.target.value = ''; }} /></label>{q.imagen && <><img src={q.imagen} alt={`Apoyo visual del reactivo ${index + 1}`} style={{ maxWidth: 180, maxHeight: 110, objectFit: 'contain', border: '1px solid #cad5df', borderRadius: 6 }} /><button type="button" style={{ ...button, background: '#8b4750', padding: '6px 10px' }} onClick={() => updateQuestion(index, { imagen: '' })}>Quitar imagen</button></>}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8, marginTop: 8 }}>{choices.map(letter => <label key={letter}>{letter}<input style={inputStyle} value={q.opciones[letter]} onChange={e => updateOption(index, letter, e.target.value)} placeholder={`Opción ${letter}`} /></label>)}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}><label>Clave<select style={{ ...inputStyle, width: 100 }} value={q.correcta} onChange={e => updateQuestion(index, { correcta: e.target.value })}><option value="">Seleccionar</option>{choices.map(letter => <option key={letter}>{letter}</option>)}</select></label><label>Puntos<input style={{ ...inputStyle, width: 100 }} type="number" min="0.01" step="0.25" value={q.puntos} onChange={e => updateQuestion(index, { puntos: e.target.value })} /></label></div>
      </article>)}
      <button disabled={questions.length >= 20} style={{ ...button, background: '#526273', opacity: questions.length >= 20 ? .55 : 1 }} onClick={() => { setValidated(false); setQuestions(items => [...items, emptyQuestion()]); }}>+ Agregar pregunta {questions.length >= 20 ? '(máximo 20)' : ''}</button>
      <div style={{ marginTop: 18, padding: 14, background: '#f2f8f6', borderRadius: 8 }}><p style={{ marginTop: 0 }}>Al guardar, el evaluador vinculará los registros de Exámenes QR de este grupo con el criterio seleccionado.</p><label style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><input type="checkbox" checked={validated} onChange={e => setValidated(e.target.checked)} />Confirmo que revisé el contenido, las cuatro opciones, la clave y el puntaje de cada pregunta.</label>
        <button disabled={!validated || busy || Boolean(result) || !selectedGroup || !titulo.trim() || !questions.length || !criterioId || (tipoExamen === 'PARCIAL' && !periodoNombre.trim())} style={{ ...button, opacity: !validated || busy || result || !criterioId || (tipoExamen === 'PARCIAL' && !periodoNombre.trim()) ? 0.5 : 1, marginTop: 12 }} onClick={createExam}>{busy ? 'Guardando…' : 'Guardar y vincular con el evaluador'}</button>
      </div>
    </section>
    {result && <section className="no-print" style={{ ...card, borderColor: result.evaluatorLinked ? '#80b8a8' : '#e3a348' }}><h2 style={{ marginTop: 0 }}>{result.examen.tipo_examen === 'PARCIAL' ? `Examen parcial · ${result.examen.periodo_nombre}` : 'Examen trimestral'} guardado {result.evaluatorLinked ? 'y vinculado' : ''}</h2><p>{result.alumnos.length} copias individuales creadas. El QR guarda identificadores opacos; no incluye el nombre. Criterio: <strong>{criterios.find(item => Number(item.id) === Number(result.vinculacion?.criterio_id))?.nombre || 'Evaluador'}</strong> · fecha {result.vinculacion?.fecha || evaluationDate}. {result.evaluatorLinked ? 'El evaluador recibirá los registros de Exámenes QR de este grupo.' : 'Falta activar el vínculo automático desde Captura QR.'}</p><button style={button} onClick={async () => { setError(''); setPdfStatus(''); try { const saved = window.planificadorAndroid ? (window.print(), { success: true, filePath: 'diálogo de impresión' }) : await ipc.invoke('examscan-export-pdf'); setPdfStatus(saved.canceled ? 'Exportación cancelada.' : `PDF guardado: ${saved.filePath}`); } catch (err) { setError(err.message || 'No se pudo generar el PDF.'); } }}>Imprimir / guardar PDF</button>{pdfStatus && <p role="status">{pdfStatus}</p>}<button style={{ ...button, background: '#536273', marginLeft: 10 }} onClick={() => { setResult(null); setValidated(false); setTitulo(''); setQuestions([emptyQuestion()]); }}>Crear otro</button></section>}
    {examToScan && <div className="no-print"><ExamScanReader ipc={ipc} examId={examToScan.id} examTitle={examToScan.titulo} onClose={() => setExamToScan(null)} onSaved={resultSaved => { onResultSaved?.(resultSaved); ipc.invoke('examscan-list-exams', selectedGroup.id).then(setHistory); }} /></div>}
    {history.length > 0 && <section className="no-print" style={card}><h2 style={{ marginTop: 0 }}>Banco de exámenes</h2>{history.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #e5ebf0' }}><span>{item.titulo} · {item.tipo_examen === 'PARCIAL' ? `Parcial · ${item.periodo_nombre}` : `Trimestral · ${item.trimestre}º trimestre`} · {item.grado}º {item.seccion} · {item.creado_en.slice(0,10)} · {item.calificados || 0} calificaciones · {item.criterio_nombre ? `Vinculado: ${item.criterio_nombre}` : 'Sin criterio evaluador'}</span><div style={{ display: 'flex', gap: 8 }}><button style={{ ...button, background: '#315fb5', whiteSpace: 'nowrap' }} onClick={() => setExamToScan(item)}>Leer hoja OMR</button><button style={{ ...button, background: '#536273', whiteSpace: 'nowrap' }} onClick={() => reuseQuestions(item)}>Usar preguntas</button></div></div>)}</section>}
    {result && <div className="examscan-print">{result.alumnos.map((student, copyIndex) => <>
      <article className="examscan-sheet exam-question-page" key={`${student.intento_id}-exam`}>
        <header className="exam-heading"><div><strong>ELARA EXAMSCAN · {result.examen.tipo_examen === 'PARCIAL' ? `EXAMEN PARCIAL · ${result.examen.periodo_nombre}` : 'EXAMEN TRIMESTRAL'}</strong><h1>{result.examen.titulo}</h1><div>{result.examen.grado}º {result.examen.seccion} · Ciclo {result.examen.ciclo_escolar} · {result.examen.trimestre}º trimestre</div><div>{result.examen.campo_formativo}</div></div><QRCodeSVG className="exam-qr" value={JSON.stringify(student.qr)} size={150} level="M" includeMargin /></header>
        <div className="exam-student">Nombre: <strong>{student.nombre}</strong><span>Folio: {student.intento_id.slice(0,8).toUpperCase()}</span></div>
        <p className="exam-meta"><strong>Contenido:</strong> {result.examen.contenido}<br/><strong>PDA:</strong> {result.examen.pda}</p>
        <p className="exam-instructions">Contesta cada pregunta. Registra una sola respuesta por pregunta en la hoja OMR. Rellena completamente el círculo con lápiz.</p>
        <div className="exam-questions">{result.examen.preguntas.map((q, i) => <div className="exam-question" key={i}><strong>{i + 1}. {q.texto}</strong>{q.imagen && <img className="exam-question-image" src={q.imagen} alt={`Apoyo visual de la pregunta ${i + 1}`} />}<div className="exam-options">{choices.map(letter => <span key={letter}><b>{letter})</b> {q.opciones[letter]}</span>)}</div></div>)}</div>
        <footer>Examen {result.examen.id.slice(0,8).toUpperCase()} · {copyIndex + 1} de {result.alumnos.length} · Hoja 1 de 2</footer>
      </article>
      <article className="examscan-sheet exam-omr-page" key={`${student.intento_id}-omr`}>
        <header className="exam-heading"><div><strong>HOJA DE RESPUESTAS · {result.examen.tipo_examen === 'PARCIAL' ? `PARCIAL · ${result.examen.periodo_nombre}` : 'TRIMESTRAL'}</strong><h1>{result.examen.titulo}</h1><div>{result.examen.grado}º {result.examen.seccion} · {result.examen.trimestre}º trimestre · Folio {student.intento_id.slice(0,8).toUpperCase()}</div></div><QRCodeSVG className="exam-qr" value={JSON.stringify(student.qr)} size={180} level="M" includeMargin /></header>
        <div className="exam-student">Nombre: <strong>{student.nombre}</strong><span>Ciclo {result.examen.ciclo_escolar}</span></div>
        <p className="exam-instructions">Rellena una sola casilla por pregunta. Usa lápiz y cubre el círculo por completo. Si cambias la respuesta, borra por completo la marca anterior. Deja en blanco cualquier pregunta que no puedas contestar.</p>
        <section className="omr"><div className="alignment alignment-tl"/><div className="alignment alignment-tr"/><div className="alignment alignment-bl"/><div className="alignment alignment-br"/><div className="omr-title">Marca una respuesta por fila</div><div className="omr-grid"><div className="omr-row omr-label"><b>Pregunta</b>{choices.map(c => <b key={c}>{c}</b>)}</div>{result.examen.preguntas.map((_, i) => <div className="omr-row" key={i}><b>{String(i + 1).padStart(2,'0')}</b>{choices.map(c => <span className="bubble" key={c} />)}</div>)}</div></section>
        <footer>Examen {result.examen.id.slice(0,8).toUpperCase()} · Clave asociada a esta versión · Hoja 2 de 2</footer>
      </article>
    </>)}</div>}
    <style>{`
      @media print { @page { size: letter; margin: 12mm; } body { background:white !important; } .examscan-screen { max-width:none !important; padding:0 !important; } .examscan-print { display:block !important; } .examscan-print > .examscan-sheet { page-break-after:always; break-after:page; } .examscan-print > .examscan-sheet:last-child { page-break-after:auto; break-after:auto; } }
      .examscan-print { display:none; color:#111; font:10pt Arial,sans-serif; } .examscan-sheet { min-height:250mm; position:relative; box-sizing:border-box; padding:0 0 8mm; display:flex; flex-direction:column; }
      .exam-heading { display:flex; justify-content:space-between; gap:12px; align-items:center; border-bottom:2px solid #111; padding-bottom:8px; } .exam-heading h1 { font-size:16pt; margin:3px 0; } .exam-qr { display:block; flex:0 0 auto; width:48mm; height:48mm; background:#fff; } .exam-student { display:flex; justify-content:space-between; border-bottom:1px solid #555; padding:8px 0; } .exam-meta { line-height:1.35; margin:8px 0; } .exam-instructions { border:1px solid #555; padding:6px; margin:3px 0 7px; } .exam-question { margin:6px 0; break-inside:avoid; line-height:1.2; } .exam-question-image { display:block; max-width:70mm; max-height:42mm; object-fit:contain; margin:4px 0 2px 10px; } .exam-options { display:grid; grid-template-columns:1fr 1fr; gap:2px 10px; padding:3px 0 0 10px; line-height:1.2; } .omr { margin-top:8px; position:relative; border:1.5px solid #111; padding:10px 12px; } .omr-title { font-weight:bold; text-align:center; margin-bottom:12px; } .omr-grid { width:78%; margin:12px auto 0; } .omr-row { display:grid; grid-template-columns:1fr repeat(4,38px); align-items:center; min-height:32px; text-align:center; border-bottom:1px solid #ddd; } .omr-label { border-bottom:1px solid #111; min-height:28px; } .bubble { border:1.4px solid #111; width:18px; height:18px; border-radius:50%; justify-self:center; } .alignment { position:absolute; width:10px; height:10px; background:#111; } .alignment-tl { top:5px; left:5px; } .alignment-tr { top:5px; right:5px; } .alignment-bl { bottom:5px; left:5px; } .alignment-br { bottom:5px; right:5px; } .examscan-sheet footer { text-align:center; font-size:8pt; margin-top:auto; padding-top:7px; }
    `}</style>
  </main>;
}
