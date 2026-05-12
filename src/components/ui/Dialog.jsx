import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Базовое модальное окно с перетаскиванием и закрытием по Escape.
 *
 * Props:
 *   title          — строка в заголовке
 *   onClose        — вызывается по Escape (передавайте handleCancel там, где нужен rollback)
 *   children       — содержимое окна ниже заголовка
 *   className      — дополнительный класс на div.dialog__content (напр. "resize__content")
 *   badge          — JSX справа от заголовка (напр. индикатор несохранённых изменений)
 */
export default function Dialog({ title, onClose, children, className = '', badge }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef  = useRef(false);
  const dragStartRef = useRef(null);

  // ── Перетаскивание ────────────────────────────────────────────────────────
  const handleHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    draggingRef.current  = true;
    dragStartRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    e.preventDefault();
  }, [offset]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !dragStartRef.current) return;
      const { sx, sy, ox, oy } = dragStartRef.current;
      setOffset({ x: ox + e.clientX - sx, y: oy + e.clientY - sy });
    };
    const onUp = () => { draggingRef.current = false; dragStartRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, []);

  // ── Escape ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <dialog className="dialog dialog--levels" open>
      <div
        className={`dialog__content${className ? ` ${className}` : ''}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div className="dialog__header" onMouseDown={handleHeaderMouseDown}>
          <h2>{title}</h2>
          {badge}
        </div>
        {children}
      </div>
    </dialog>
  );
}
