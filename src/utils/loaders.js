import { sniffDepth } from './file';
import { decodeGB7 } from './gb7';

export async function loadStandard(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const tmp = new OffscreenCanvas(width, height);
  const ctx = tmp.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const raw = ctx.getImageData(0, 0, width, height);
  return {
    imageData: raw,
    meta: {
      width,
      height,
      depth:    sniffDepth(raw.data),
      filename: file.name,
      format:   file.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG',
    },
  };
}

export async function loadGB7(file) {
  const buf = await file.arrayBuffer();
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
