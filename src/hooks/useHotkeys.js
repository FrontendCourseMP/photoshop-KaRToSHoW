import { useEffect } from 'react';

const isEditableElement = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

export default function useHotkeys(actions) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditableElement(e.target)) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        if (key === 'o') {
          e.preventDefault();
          actions.onOpenFile?.();
        }
        if (key === '=' || key === '+') {
          e.preventDefault();
          actions.onZoomIn?.();
        }
        if (key === '-') {
          e.preventDefault();
          actions.onZoomOut?.();
        }
        if (key === '1') {
          e.preventDefault();
          actions.onActualSize?.();
        }
        if (key === '2') {
          e.preventDefault();
          actions.onFitScreen?.();
        }
      } else if (!e.altKey && !e.metaKey) {
        if (key === 'z') {
          e.preventDefault();
          actions.onZoomTool?.();
        }
        if (key === 'h') {
          e.preventDefault();
          actions.onHandTool?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [actions]);
}
