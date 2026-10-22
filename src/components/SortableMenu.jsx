import React, { useRef, useState } from 'react';
import './SortableMenu.css';

// Keep new modules visible and ignore removed, repeated or invalid saved IDs.
export function reconcileOrder(saved, ids) {
  return [...new Set([...(Array.isArray(saved) ? saved.filter(id => ids.includes(id)) : []), ...ids])];
}

export default function SortableMenu({ items, edition }) {
  const storageKey = `elara-menu-order-v1:${edition}`;
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return []; }
  });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(null);
  const [target, setTarget] = useState(null);
  const drag = useRef(null);
  const grid = useRef(null);
  const ids = reconcileOrder(order, items.map(item => item.id));
  const byId = new Map(items.map(item => [item.id, item]));

  const save = (next, text) => {
    setOrder(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setError(''); setMessage(text + ' Orden guardado en este dispositivo.');
    } catch {
      setMessage('');
      setError('El orden cambió, pero no se pudo guardar. Puede perderse al salir del menú.');
    }
  };
  const move = (id, toId) => {
    if (id === toId || !ids.includes(toId)) return;
    const next = ids.filter(value => value !== id);
    next.splice(ids.indexOf(toId), 0, id);
    save(next, `${byId.get(id).label}: posición ${next.indexOf(id) + 1} de ${next.length}.`);
  };
  const cancelDrag = () => {
    drag.current = null; setDragging(null); setTarget(null);
  };
  const start = (event, id) => {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: id, moved: false };
  };
  const track = event => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
    current.moved = true; setDragging(current.id);
    // Pointer capture keeps touch dragging active; hit testing finds the card below it.
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-menu-id]');
    current.target = cell && grid.current?.contains(cell) ? cell.dataset.menuId : null;
    setTarget(current.target);
    if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 20);
    else if (event.clientY < 70) window.scrollBy(0, -20);
  };
  const finish = event => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.moved && current.target) move(current.id, current.target);
    cancelDrag();
  };

  return <>
    <div className={`menu-order-toolbar${editing ? ' is-editing' : ''}`}>
      <button type="button" aria-expanded={editing} aria-controls="sortable-menu-grid" onClick={() => { cancelDrag(); setEditing(!editing); }}>
        {editing ? 'Terminar de organizar' : 'Organizar menú'}
      </button>
      {editing && <button type="button" onClick={() => save(items.map(item => item.id), 'Orden original restaurado.')}>Restablecer orden original</button>}
      {editing && <p>Arrastra desde «Mover» o usa las flechas.</p>}
      <p className="menu-order-status" role="status">{message}</p>
      {error && <p role="alert">{error}</p>}
    </div>
    <div id="sortable-menu-grid" className={`grid-menu sortable-menu${editing ? ' is-editing' : ''}`} ref={grid}>
      {ids.map((id, index) => {
        const item = byId.get(id);
        return <div key={id} data-menu-id={id} className={`menu-order-card${dragging === id ? ' is-dragging' : ''}${target === id && dragging !== id ? ' is-drop-target' : ''}`}>
          <button type="button" className="boton-menu" onClick={() => { if (!editing) item.action(); }} aria-disabled={editing || undefined} style={{ '--card-color': item.color, '--delay': `${index * 0.06}s` }}>
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
            <span className="menu-desc">{item.desc}</span>
          </button>
          {editing && <div className="menu-order-controls">
            <button type="button" className="menu-drag-handle" aria-label={`Mover ${item.label}`} title="Arrastra o usa las flechas del teclado" onPointerDown={event => start(event, id)} onPointerMove={track} onPointerUp={finish} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onKeyDown={event => {
              if (event.key === 'Escape') { cancelDrag(); return; }
              const offset = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0;
              if (offset) { event.preventDefault(); move(id, ids[index + offset]); }
            }}>⠿ Mover</button>
            <button type="button" aria-label={`Mover ${item.label} antes`} disabled={index === 0} onClick={() => move(id, ids[index - 1])}>←</button>
            <button type="button" aria-label={`Mover ${item.label} después`} disabled={index === ids.length - 1} onClick={() => move(id, ids[index + 1])}>→</button>
          </div>}
        </div>;
      })}
    </div>
  </>;
}
