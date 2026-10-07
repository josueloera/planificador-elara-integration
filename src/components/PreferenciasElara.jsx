import { useEffect, useState } from 'react';
import { EVENTO_PREFERENCIAS_ELARA, leerPreferenciasElara, guardarPreferenciasElara } from '../elaraPreferences';

export default function PreferenciasElara() {
  const [preferencias, setPreferencias] = useState(leerPreferenciasElara);
  useEffect(() => {
    const actualizar = () => setPreferencias(leerPreferenciasElara());
    window.addEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);
  const cambiar = (campo, valor) => guardarPreferenciasElara({ ...preferencias, [campo]: valor });
  return (
    <section style={{ marginBottom: 20, padding: 15, background: '#f8f9fa', borderRadius: 8, color: '#34495e' }}>
      <h3 style={{ margin: '0 0 12px' }}>Asistente ELARA</h3>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input type="checkbox" checked={preferencias.visible} onChange={e => cambiar('visible', e.target.checked)} />{' '}
        Mostrar el icono de ELARA
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={preferencias.consejos} disabled={!preferencias.visible}
          onChange={e => cambiar('consejos', e.target.checked)} />{' '}
        Mostrar consejos automáticos
      </label>
      <p style={{ fontSize: 13, marginBottom: 0 }}>Los cambios se guardan al instante. Puedes volver a mostrar ELARA aquí cuando la necesites.</p>
    </section>
  );
}
