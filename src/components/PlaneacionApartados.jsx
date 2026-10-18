import { FORMULARIO_PROYECTO } from '../utils/planeacionDocument';
import './PlaneacionApartados.css';

export default function PlaneacionApartados({ value, onChange }) {
  const apartados = value ?? {};
  return <section className="plano-didactico no-print" aria-label="Plano didáctico">
    <h3>Plano didáctico</h3>
    <p>Completa los apartados de tu planeación. Se conservan al guardar y se incluyen al exportar a Word o PDF.</p>
    <div className="plano-didactico-campos">
      {FORMULARIO_PROYECTO.map(field => <label className="plano-didactico-campo" key={field.key}>
        <span>{field.label}</span>
        <textarea rows={field.multiline ? 3 : 2} value={apartados[field.key] ?? ''}
          onChange={event => onChange(field.key, event.target.value)} />
      </label>)}
    </div>
  </section>;
}
