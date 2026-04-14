import { useState } from 'react';

// Список поддерживаемых форматов для drag & drop
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gb7'];

// Просмотр изображения с drag/drop и отображением холста
export default function Viewport({ t, imageInfo, cursor, onMouseDown, onOpenFile, onError, canvasRef, viewportRef, clearError, offset, zoom }) {
  const [isDragging, setIsDragging] = useState(false);

  // Проверяет, что файл имеет допустимое расширение
  const validateFile = (file) => {
    if (!file || !file.name) return false;
    const name = file.name.toLowerCase();
    return SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext));
  };

  // Обрабатывает сброс файла в область просмотра
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!validateFile(file)) {
      onError?.(t('error.unsupported'));
      return;
    }
    onOpenFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`viewport${isDragging ? ' viewport--drag' : ''}`}
      ref={viewportRef}
      style={{ cursor }}
      onMouseDown={onMouseDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isDragging && (
        <div className="drop-overlay">{t('empty.drop')}</div>
      )}

      {!imageInfo && (
        <div className="empty">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="empty__icon">
            <rect x="6" y="12" width="44" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" opacity=".4" />
            <circle cx="19" cy="23" r="4" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
            <path d="M6 36l12-10 9 7 8-6 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
          </svg>
          <p className="empty__title">{t('empty.title')}</p>
          <p className="empty__sub">{t('empty.sub').split('Ctrl+O').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <kbd>Ctrl+O</kbd>}</span>
          ))}</p>
          <p className="empty__formats">{t('empty.formats')}</p>
        </div>
      )}

      <div className="scene"
        style={{
          position: 'absolute',
          left: 0, top: 0,
          width: imageInfo?.width ?? 1,
          height: imageInfo?.height ?? 1,
          transformOrigin: '0 0',
          transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})`,
          willChange: 'transform',
          visibility: imageInfo ? 'visible' : 'hidden',
          pointerEvents: imageInfo ? 'auto' : 'none',
        }}
      >
        <canvas ref={canvasRef} className="image-canvas" />
      </div>
    </div>
  );
}
