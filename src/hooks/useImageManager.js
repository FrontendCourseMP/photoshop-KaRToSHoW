import { useCallback, useRef } from 'react';
import { downloadBlob } from '../utils/file';
import { encodeGB7 }    from '../utils/gb7';
import { loadStandard, loadGB7 } from '../utils/loaders';

// ─── Реестр форматов ──────────────────────────────────────────────────────────
// Чтобы добавить формат — достаточно добавить запись сюда.
const FORMATS = [
  {
    test:   name => name.endsWith('.gb7'),
    loader: loadGB7,
  },
  {
    test:   name => name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'),
    loader: loadStandard,
  },
];

function buildChannels(depth) {
  const d        = depth.toLowerCase();
  const isGray   = d.includes('gray');
  const hasAlpha = d.includes('alpha') || d.includes('rgba');
  return isGray
    ? { Gray: true, A: !!hasAlpha }
    : { R: true, G: true, B: true, A: !!hasAlpha };
}

export default function useImageManager({
  canvasRef,
  setImageInfo,
  setOriginalImageData,
  setChannels,
  setError,
  t,
}) {
  // Токен предотвращает гонку: если пользователь открыл файл B пока грузился A,
  // устаревший результат A будет проигнорирован.
  const loadTokenRef = useRef(0);

  // Очищает видимое содержимое canvas, не трогая размеры
  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }, [canvasRef]);

  // Устанавливает новые размеры canvas, очищает и рисует ImageData
  const renderToCanvas = useCallback((imageData) => {
    const c   = canvasRef.current;
    const ctx = c.getContext('2d');
    c.width   = imageData.width;
    c.height  = imageData.height;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.putImageData(imageData, 0, 0);
  }, [canvasRef]);

  // Атомарно фиксирует все три среза состояния —
  // React 18 батчует вызовы в один рендер, Effect канала получает согласованные данные.
  const commit = useCallback((imageData, meta) => {
    setOriginalImageData(new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height));
    setChannels(buildChannels(meta.depth));
    setImageInfo(meta);
  }, [setImageInfo, setOriginalImageData, setChannels]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);

    const name   = file.name.toLowerCase();
    const format = FORMATS.find(f => f.test(name));
    if (!format) {
      setError(t('error.unsupported'));
      return;
    }

    // Новый токен — старые незавершённые загрузки станут невалидными
    const token = ++loadTokenRef.current;

    // Очищаем холст и состояние до начала асинхронной загрузки:
    // пользователь сразу видит пустой canvas, а не остатки предыдущего файла.
    clearCanvas();
    setImageInfo(null);
    setOriginalImageData(null);
    setChannels({});

    try {
      const { imageData, meta } = await format.loader(file);
      if (token !== loadTokenRef.current) return; // загрузка устарела

      renderToCanvas(imageData);
      commit(imageData, meta);
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      // Ошибки GB7 уже содержат префикс "GB7:"; остальные переводим
      setError(err.message.startsWith('GB7:') ? err.message : t('error.cannotLoad'));
    }
  }, [clearCanvas, renderToCanvas, commit, setImageInfo, setOriginalImageData, setChannels, setError, t]);

  const saveAs = useCallback((fmt, imageInfo) => {
    const c = canvasRef.current;
    if (!c || !imageInfo) return;
    const base = (imageInfo.filename || 'image').replace(/\.[^.]+$/, '');

    if (fmt === 'png') {
      c.toBlob(b => downloadBlob(b, `${base}.png`), 'image/png');
    } else if (fmt === 'jpg') {
      c.toBlob(b => downloadBlob(b, `${base}.jpg`), 'image/jpeg', 0.92);
    } else if (fmt === 'gb7') {
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      downloadBlob(new Blob([encodeGB7(data)], { type: 'application/octet-stream' }), `${base}.gb7`);
    }
  }, [canvasRef]);

  return { handleFile, saveAs };
}
