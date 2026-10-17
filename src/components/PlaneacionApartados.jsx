import { FORMULARIO_PROYECTO, APARTADOS_PLANEACION } from '../utils/planeacionDocument';

export default function PlaneacionApartados({ tipo, value = {}, onChange }) {
  const fields = tipo === 'proyecto' ? FORMULARIO_PROYECTO : APARTADOS_PLANEACION;
  return <section className="seccion-plan planeacion-apartados" aria-label="Apartados del plano didáctico">
    <h3>Apartados del plano didáctico</h3>
    <p>Estos apartados se conservan al guardar y aparecen al exportar en Word o PDF.</p>
    <div className="apartados-grid">
      {fields.map(field => <label className="apartado-campo" key={field.key}>
        <span>{field.label}</span>
        {field.multiline
          ? <textarea rows={3} value={value?.[field.key] || ''} onChange={event => onChange(field.key, event.target.value)} />
          : <input value={value?.[field.key] || ''} onChange={event => onChange(field.key, event.target.value)} />}
        <span className="only-print-text">{value?.[field.key] || 'Sin especificación.'}</span>
      </label>)}
    </div>
  </section>;
}
