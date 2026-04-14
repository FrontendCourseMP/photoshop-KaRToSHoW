import { useState, useRef, useEffect } from 'react';

// Выпадающее меню с элементами и разделителями
export default function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button className={`menu__trigger${open ? ' menu__trigger--open' : ''}`} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <ul className="menu__dropdown" onMouseLeave={() => setOpen(false)}>
          {items.map((item, i) =>
            item === '---'
              ? <li key={i} className="menu__sep" />
              : <li key={i}>
                  <button className="menu__item" disabled={item.disabled}
                    onClick={() => { item.action?.(); setOpen(false); }}>
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu__shortcut">{item.shortcut}</span>}
                  </button>
                </li>
          )}
        </ul>
      )}
    </div>
  );
}
