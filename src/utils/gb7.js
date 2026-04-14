const SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const HEADER_SIZE = 12;

/**
 * Декодирует файл GB7 в объект ImageData.
 * @param {ArrayBuffer} buffer
 * @returns {{ imageData: ImageData, width: number, height: number, hasMask: boolean }}
 */
export function decodeGB7(buffer) {
  const bytes = new Uint8Array(buffer);

  // Проверяем сигнатуру
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) {
      throw new Error(`Invalid GB7 signature at byte ${i}: expected 0x${SIGNATURE[i].toString(16)}, got 0x${bytes[i].toString(16)}`);
    }
  }

  const version = bytes[4];
  if (version !== 0x01) {
    throw new Error(`Unsupported GB7 version: ${version}`);
  }

  const flag = bytes[5];
  const hasMask = (flag & 0x01) === 1;

  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];
  // байты 10 и 11 зарезервированы

  const expectedSize = HEADER_SIZE + width * height;
  if (bytes.length < expectedSize) {
    throw new Error(`GB7 file too short: expected ${expectedSize} bytes, got ${bytes.length}`);
  }

  const imageData = new ImageData(width, height);
  const pixels = imageData.data; // RGBA, 4 байта на пиксель

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[HEADER_SIZE + i];

    // Биты 6–0: значение яркости (0–127), преобразуем в 0–255
    const gray7 = byte & 0x7f;
    const gray8 = Math.round((gray7 / 127) * 255);

    // Бит 7: маска
    const maskBit = (byte >> 7) & 0x01;
    const alpha = hasMask ? (maskBit === 1 ? 255 : 0) : 255;

    const idx = i * 4;
    pixels[idx + 0] = gray8; // R
    pixels[idx + 1] = gray8; // G
    pixels[idx + 2] = gray8; // B
    pixels[idx + 3] = alpha; // A
  }

  return { imageData, width, height, hasMask };
}

/**
 * Кодирует объект ImageData в ArrayBuffer формата GB7.
 * Преобразует цветное изображение в градации серого. Сохраняет прозрачность как маску, если alpha < 128.
 * @param {ImageData} imageData
 * @returns {ArrayBuffer}
 */
export function encodeGB7(imageData) {
  const { width, height, data } = imageData;

  // Проверяем, есть ли прозрачные пиксели
  let hasMask = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) { hasMask = true; break; }
  }

  const totalBytes = HEADER_SIZE + width * height;
  const buffer = new ArrayBuffer(totalBytes);
  const out = new Uint8Array(buffer);

  // Сигнатура
  out[0] = 0x47; out[1] = 0x42; out[2] = 0x37; out[3] = 0x1d;
  // Версия
  out[4] = 0x01;
  // Флаг
  out[5] = hasMask ? 0x01 : 0x00;
  // Ширина (big-endian)
  out[6] = (width >> 8) & 0xff;
  out[7] = width & 0xff;
  // Высота (big-endian)
  out[8] = (height >> 8) & 0xff;
  out[9] = height & 0xff;
  // Зарезервировано
  out[10] = 0x00; out[11] = 0x00;

  // Данные пикселей
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx + 0];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Яркость (BT.601)
    const gray8 = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    // Масштаб 0–255 → 0–127
    const gray7 = Math.round((gray8 / 255) * 127);

    const maskBit = hasMask ? (a >= 128 ? 1 : 0) : 0;
    out[HEADER_SIZE + i] = (maskBit << 7) | (gray7 & 0x7f);
  }

  return buffer;
}

/**
 * Читает базовую метадату из GB7 без декодирования пикселей.
 */
export function peekGB7(buffer) {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error('Not a GB7 file');
  }
  const flag = bytes[5];
  const hasMask = (flag & 0x01) === 1;
  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];
  return { width, height, hasMask, version: bytes[4] };
}