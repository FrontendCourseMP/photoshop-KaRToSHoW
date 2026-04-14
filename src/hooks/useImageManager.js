import { useCallback } from 'react';
import { downloadBlob, sniffDepth } from '../utils/file';
import { decodeGB7, encodeGB7 } from '../utils/gb7';

// Хук для загрузки и сохранения изображений в разных форматах
export default function useImageManager({ canvasRef, drawImageData, setImageInfo, setError, t }) {
  // Загружает PNG/JPEG файл, рисует его на canvas и сохраняет метаданные
  const loadStandard = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const c = canvasRef.current;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        depth: sniffDepth(d.data),
        filename: file.name,
        format: file.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG',
      });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => { setError(t('error.cannotLoad')); URL.revokeObjectURL(url); };
    img.src = url;
  }, [canvasRef, setError, setImageInfo, t]);

  // Загружает специфичный GB7 формат, декодирует и отображает изображение
  const loadGB7 = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { imageData, width, height, hasMask } = decodeGB7(e.target.result);
        drawImageData(imageData);
        setImageInfo({
          width,
          height,
          depth: hasMask ? '7-bit gray + mask' : '7-bit grayscale',
          filename: file.name,
          format: 'GB7',
        });
      } catch (err) {
        setError(`GB7: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [drawImageData, setError, setImageInfo]);

  // Выбирает схему загрузки по расширению файла
  const handleFile = useCallback((file) => {
    if (!file) return;
    setError(null);
    const n = file.name.toLowerCase();
    if (n.endsWith('.gb7')) loadGB7(file);
    else if (n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg')) loadStandard(file);
    else setError(t('error.unsupported'));
  }, [loadGB7, loadStandard, setError, t]);

  // Сохраняет изображение из canvas в выбранный формат
  const saveAs = useCallback((fmt, imageInfo) => {
    const c = canvasRef.current;
    if (!c || !imageInfo) return;
    const base = (imageInfo.filename || 'image').replace(/\.[^.]+$/, '');
    if (fmt === 'png') c.toBlob(b => downloadBlob(b, `${base}.png`), 'image/png');
    if (fmt === 'jpg') c.toBlob(b => downloadBlob(b, `${base}.jpg`), 'image/jpeg', 0.92);
    if (fmt === 'gb7') {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      downloadBlob(new Blob([encodeGB7(d)], { type: 'application/octet-stream' }), `${base}.gb7`);
    }
  }, [canvasRef]);

  return { handleFile, saveAs };
}
