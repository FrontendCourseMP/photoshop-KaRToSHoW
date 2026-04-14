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
        <ul className="menu__dropdown">
          {items.map((item, i) =>
            item === '---'
              ? <li key={i} className="menu__sep" />
              : <li key={i} className={item.children ? 'menu__has-children' : undefined}>
                  <button className="menu__item" disabled={item.disabled}
                    onClick={() => { if (!item.children) { item.action?.(); setOpen(false); } }}>
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu__shortcut">{item.shortcut}</span>}
                    {item.children && <span className="menu__arrow">›</span>}
                  </button>
                  {item.children && (
                    <ul className="menu__submenu">
                      {item.children.map((child, j) => (
                        <li key={j}>
                          <button className="menu__item" disabled={child.disabled}
                            onClick={() => { child.action?.(); setOpen(false); }}>
                            <span>{child.label}</span>
                            {child.shortcut && <span className="menu__shortcut">{child.shortcut}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
          )}
        </ul>
      )}
    </div>
  );
}
