import { sniffDepth } from './file';
import { decodeGB7 } from './gb7';

// Ждёт загрузки HTMLImageElement
function waitForImage(url) {
  return new Promise((resolve, reject) => {
    const img  = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('не удалось декодировать изображение'));
    img.src = url;
  });
}

// Читает File как ArrayBuffer
function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('не удалось прочитать файл'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Публичные загрузчики ─────────────────────────────────────────────────────
// Каждый возвращает Promise<{ imageData: ImageData, meta: object }>

export async function loadStandard(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await waitForImage(url);

    // Отдельный canvas — не трогаем основной во время декодирования
    const tmp = document.createElement('canvas');
    tmp.width  = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const ctx  = tmp.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // getImageData после drawImage учитывает ICC-профиль браузера
    const raw = ctx.getImageData(0, 0, tmp.width, tmp.height);

    return {
      imageData: raw,
      meta: {
        width:    tmp.width,
        height:   tmp.height,
        depth:    sniffDepth(raw.data),
        filename: file.name,
        format:   file.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG',
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadGB7(file) {
  const buf = await readAsArrayBuffer(file);
  try {
    const { imageData, width, height, hasMask } = decodeGB7(buf);
    return {
      imageData,
      meta: {
        width,
        height,
        depth:    hasMask ? '7-bit gray + mask' : '7-bit grayscale',
        filename: file.name,
        format:   'GB7',
      },
    };
  } catch (err) {
    throw new Error(`GB7: ${err.message}`);
  }
}
