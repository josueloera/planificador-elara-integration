import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeOmrQr, readOmrSheet } from '../examScanReader';

const choices = ['', 'A', 'B', 'C', 'D'];
const card = { background: 'white', border: '1px solid #d8e2ec', borderRadius: 12, padding: 18, margin: '14px 0' };
const button = { background: '#147768', color: 'white', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 };
const luminance = (data, index) => data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;

async function loadImageFile(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) throw new Error('Selecciona un archivo de imagen de la hoja OMR.');
  if (file.size > 24 * 1024 * 1024) throw new Error('La imagen pesa demasiado. Selecciona una foto de hasta 24 MB.');
  const url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo de imagen está dañado o no se puede abrir.'));
    image.src = url;
  });
}

function imageDataFromImage(image, maxDimension = 2000) {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function sharpnessScore(image) {
  let score = 0, samples = 0;
  const step = Math.max(2, Math.round(Math.max(image.width, image.height) / 180));
  for (let y = 0; y < image.height - step; y += step) {
    for (let x = 0; x < image.width - step; x += step) {
      const index = (y * image.width + x) * 4;
      const right = index + step * 4;
      const below = index + step * image.width * 4;
      score += Math.abs(luminance(image.data, index) - luminance(image.data, right));
      score += Math.abs(luminance(image.data, index) - luminance(image.data, below));
      samples++;
    }
  }
  return samples ? score / samples : 0;
}

export default function ExamScanReader({ ipc, examId, examTitle, onClose, onSaved }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [markStates, setMarkStates] = useState([]);
  const [preview, setPreview] = useState('');
  const [sourcePreview, setSourcePreview] = useState('');
  const [savedGrade, setSavedGrade] = useState(null);

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return undefined;
    video.srcObject = stream;
    video.play().catch(err => setError(`La cámara se abrió, pero no se pudo mostrar el video: ${err.message}`));
    return undefined;
  }, [cameraOn]);
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este equipo no ofrece acceso a una cámara. Puedes importar una foto de la hoja.');
      stopCamera();
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 2560 }, height: { ideal: 1440 } } }); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } }); }
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) { setError(`No se pudo abrir la cámara: ${err.message}`); }
  };

  const processImage = async imageData => {
    setError(''); setStatus('Buscando el QR y las marcas de alineación…'); setReading(true); setSavedGrade(null);
    try {
      const payload = decodeOmrQr(imageData);
      const resolved = await ipc.invoke('examscan-resolve-qr', payload);
      if (resolved.examen_id !== examId) throw new Error('El QR pertenece a otro examen. Selecciona el examen que corresponde a esta hoja.');
      const accurate = readOmrSheet(imageData, resolved.preguntas.length);
      setAttempt(resolved);
      setAnswers(accurate.answers.map(answer => answer.respuesta));
      setMarkStates(accurate.answers.map(answer => answer.estado));
      setPreview(accurate.alignedPreview);
      setStatus(`Hoja identificada: ${resolved.alumno}. Confirma o corrige las respuestas antes de guardar.`);
    } catch (err) { setError(err.message || 'No se pudo leer la hoja de respuestas.'); setStatus(''); }
    finally { setReading(false); }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { setError('Espera a que la cámara muestre la hoja completa.'); return; }
    setCapturing(true); setError('');
    const canvas = canvasRef.current;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = video.videoWidth; sourceCanvas.height = video.videoHeight;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    let bestFrame = null, bestScore = -1;
    try {
      for (let shot = 0; shot < 3; shot++) {
        if (!streamRef.current || video.readyState < 2) break;
        sourceContext.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
        const frame = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const score = sharpnessScore(frame);
        if (score > bestScore) { bestFrame = frame; bestScore = score; }
        setStatus(`Buscando la toma más nítida (${shot + 1}/3)…`);
        if (shot < 2) await new Promise(resolve => setTimeout(resolve, 180));
      }
      if (!bestFrame) throw new Error('La cámara dejó de transmitir. Vuelve a abrirla e inténtalo de nuevo.');
    } catch (err) {
      setError(err.message || 'No se pudo capturar la hoja.');
      setCapturing(false);
      return;
    }
    const sourceSize = Math.max(video.videoWidth, video.videoHeight);
    // Webcams commonly return a 640x480 stream even when a larger size was
    // requested. Upscaling gives the marker detector enough pixels to find
    // the printed alignment squares; high-resolution frames stay capped.
    const scale = Math.min(3, 1600 / sourceSize);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    sourceContext.putImageData(bestFrame, 0, 0);
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    const frame = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
    setSourcePreview(canvas.toDataURL('image/jpeg', 0.82));
    setPreview('');
    stopCamera();
    await processImage(frame);
    setCapturing(false);
  };

  const importPhoto = async file => {
    if (!file) return;
    setError('');
    try {
      const image = await loadImageFile(file);
      const sourceCanvas = document.createElement('canvas');
      const sourceScale = Math.min(1, 1600 / Math.max(image.width, image.height));
      sourceCanvas.width = Math.max(1, Math.round(image.width * sourceScale));
      sourceCanvas.height = Math.max(1, Math.round(image.height * sourceScale));
      sourceCanvas.getContext('2d').drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
      setSourcePreview(sourceCanvas.toDataURL('image/jpeg', 0.82));
      setPreview('');
      await processImage(imageDataFromImage(image));
    }
    catch (err) { setError(err.message || 'No se pudo abrir la foto.'); }
  };

  const grade = useMemo(() => {
    if (!attempt) return null;
    const questions = attempt.preguntas;
    const possible = questions.reduce((sum, q) => sum + Number(q.puntos), 0);
    const earned = questions.reduce((sum, q, index) => sum + (answers[index] === q.correcta ? Number(q.puntos) : 0), 0);
    return { possible, earned, value: possible ? Math.round((earned / possible) * 100) / 10 : 0 };
  }, [attempt, answers]);

  const saveResult = async () => {
    if (!attempt || !grade || saving) return;
    setError(''); setSaving(true);
    try {
      const result = await ipc.invoke('examscan-save-result', { intento_id: attempt.intento_id, respuestas: answers });
      setSavedGrade(result);
      setStatus(`Calificación ${result.calificacion.toFixed(1)} guardada en el evaluador.`);
      onSaved?.(result);
    } catch (err) { setError(err.message || 'No se pudo guardar la calificación.'); }
    finally { setSaving(false); }
  };

  return <section style={{ ...card, borderColor: '#96b6e1' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}><div><h2 style={{ margin: '0 0 6px' }}>Leer hoja OMR</h2><div>{examTitle}</div></div><button type="button" style={{ ...button, background: '#536273' }} onClick={() => { stopCamera(); onClose(); }}>Cerrar</button></div>
    <p style={{ color: '#536273' }}>Coloca la hoja de respuestas completa en posición vertical. Deben verse el QR del encabezado y las cuatro marcas negras de alineación.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      {!cameraOn ? <button type="button" style={button} onClick={startCamera}>Abrir cámara</button> : <><button type="button" style={button} disabled={reading || capturing} onClick={capture}>{capturing ? 'Tomando fotos…' : 'Capturar y leer hoja'}</button><button type="button" disabled={capturing} style={{ ...button, background: '#536273', opacity: capturing ? .65 : 1 }} onClick={stopCamera}>Apagar cámara</button></>}
      <label style={{ ...button, background: '#315fb5', display: 'inline-block' }}>Importar foto<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Importar foto OMR" style={{ display: 'none' }} onChange={event => { importPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label>
    </div>
    {cameraOn && <video ref={videoRef} autoPlay playsInline muted aria-label="Vista de la cámara para escanear la hoja" style={{ width: '100%', maxHeight: 520, minHeight: 260, objectFit: 'contain', background: '#111', borderRadius: 8 }} />}
    <canvas ref={canvasRef} style={{ display: 'none' }} />
    {sourcePreview && !attempt && <img src={sourcePreview} alt="Foto importada de la hoja de respuestas" style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain', border: '1px solid #dce4eb', borderRadius: 8, margin: '12px 0' }} />}
    {reading && <p role="status">{status}</p>}{error && <p role="alert" style={{ color: '#a52727', background: '#fff0f0', border: '1px solid #f0b5b5', padding: 10, borderRadius: 8 }}>{error}</p>}{status && !reading && <p role="status">{status}</p>}
    {attempt && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) minmax(200px,320px)', gap: 16, alignItems: 'start' }}>
        <div><h3>Alumno: {attempt.alumno}</h3><p>Revisa cada respuesta detectada. Las casillas sin marca o con marcas múltiples se dejan vacías para corregirlas manualmente.</p>
          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #dce4eb', borderRadius: 8 }}>
            {attempt.preguntas.map((question, index) => {
              const response = answers[index];
              const correct = Boolean(response) && response === question.correcta;
              const incorrect = Boolean(response) && response !== question.correcta;
              const multiple = markStates[index] === 'multiple';
              const tone = correct ? '#22734b' : incorrect ? '#b42318' : multiple ? '#a15b00' : '#657586';
              const feedback = incorrect ? `Detectada · incorrecta · clave ${question.correcta}` : correct ? 'Detectada · correcta' : multiple ? 'Marca múltiple · selecciona la respuesta correcta' : 'Sin respuesta detectada';
              return <label key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 100px', gap: 8, alignItems: 'center', padding: 9, borderBottom: '1px solid #e8edf2', borderLeft: `4px solid ${incorrect ? '#d92d20' : correct ? '#2e8b57' : 'transparent'}`, background: incorrect ? '#fff1f0' : correct ? '#f3faf5' : 'white' }}><span><strong style={{ color: incorrect ? '#b42318' : 'inherit' }}>{index + 1}.</strong> {question.texto}<small style={{ display: 'block', color: tone, fontWeight: incorrect ? 700 : 400 }}>{feedback}</small></span><select aria-label={`Respuesta de la pregunta ${index + 1}`} value={response || ''} style={{ borderColor: incorrect ? '#d92d20' : undefined, background: incorrect ? '#fff8f7' : undefined }} onChange={event => setAnswers(old => old.map((answer, i) => i === index ? event.target.value : answer))}><option value="">En blanco</option>{choices.slice(1).map(choice => <option key={choice}>{choice}</option>)}</select></label>;
            })}
          </div>
        </div>
        <div><h3>Resultado provisional</h3><div style={{ fontSize: 28, fontWeight: 800, color: '#147768' }}>{grade?.value.toFixed(1)} / 10</div><p>{grade?.earned} de {grade?.possible} puntos</p>{(preview || sourcePreview) && <img src={preview || sourcePreview} alt={preview ? 'Vista rectificada del bloque de respuestas' : 'Foto importada de la hoja de respuestas'} style={{ display: 'block', width: '100%', maxHeight: 520, objectFit: 'contain', border: '1px solid #dce4eb', borderRadius: 8 }} />}{preview && sourcePreview && <details style={{ marginTop: 8 }}><summary>Ver foto original</summary><img src={sourcePreview} alt="Foto original de la hoja de respuestas" style={{ display: 'block', width: '100%', marginTop: 8, border: '1px solid #dce4eb', borderRadius: 8 }} /></details>}<button type="button" disabled={saving || Boolean(savedGrade)} style={{ ...button, width: '100%', marginTop: 12, opacity: saving || savedGrade ? .6 : 1 }} onClick={saveResult}>{saving ? 'Guardando…' : savedGrade ? 'Calificación guardada' : 'Confirmar y guardar calificación'}</button>{savedGrade && <p>La nota quedó registrada en la fecha {savedGrade.fecha} y vinculada al criterio del examen.</p>}</div>
      </div>
    </>}
  </section>;
}
