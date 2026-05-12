// ─── Формат GB7 ───────────────────────────────────────────────────────────────
//
//  Смещение  Размер  Поле
//  0         4       Сигнатура  0x47 0x42 0x37 0x1d  ("GB7\x1d")
//  4         1       Версия     0x01
//  5         1       Флаги      бит 0 = hasMask
//  6         2       Ширина     big-endian uint16
//  8         2       Высота     big-endian uint16
//  10        2       Зарезерв.  0x0000
//  12+       w×h     Пиксели    1 байт/пиксель: бит 7 = маска, биты 6–0 = яркость 0–127

const SIGNATURE   = [0x47, 0x42, 0x37, 0x1d];
const HEADER_SIZE = 12;

// 7-bit gray (0–127) → 8-bit gray (0–255)
const DECODE_LUT = new Uint8Array(128);
for (let i = 0; i < 128; i++) DECODE_LUT[i] = Math.round((i / 127) * 255);

// 8-bit gray (0–255) → 7-bit gray (0–127)
const ENCODE_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) ENCODE_LUT[i] = Math.round((i / 255) * 127);

// ─── Декодер ─────────────────────────────────────────────────────────────────

/**
 * Декодирует файл GB7 в объект ImageData.
 * @param {ArrayBuffer} buffer
 * @returns {{ imageData: ImageData, width: number, height: number, hasMask: boolean }}
 */
export function decodeGB7(buffer) {
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i])
      throw new Error(`неверная сигнатура: байт ${i} = 0x${bytes[i].toString(16)}`);
  }

  if (bytes[4] !== 0x01)
    throw new Error(`неподдерживаемая версия: ${bytes[4]}`);

  const hasMask = (bytes[5] & 0x01) === 1;
  const width   = (bytes[6] << 8) | bytes[7];
  const height  = (bytes[8] << 8) | bytes[9];

  const pixelCount  = width * height;
  const expectedLen = HEADER_SIZE + pixelCount;
  if (bytes.length < expectedLen)
    throw new Error(`файл обрезан: нужно ${expectedLen} байт, получено ${bytes.length}`);

  const imageData = new ImageData(width, height);
  const dst       = imageData.data;

  if (hasMask) {
    for (let i = 0; i < pixelCount; i++) {
      const byte = bytes[HEADER_SIZE + i];
      const g    = DECODE_LUT[byte & 0x7f];
      const o    = i * 4;
      dst[o] = dst[o + 1] = dst[o + 2] = g;
      // (byte >> 7) даёт 0 или 1 без условного перехода → * 255
      dst[o + 3] = (byte >> 7) * 255;
    }
  } else {
    // Отдельная ветка без проверки маски в каждой итерации
    for (let i = 0; i < pixelCount; i++) {
      const g = DECODE_LUT[bytes[HEADER_SIZE + i] & 0x7f];
      const o = i * 4;
      dst[o] = dst[o + 1] = dst[o + 2] = g;
      dst[o + 3] = 255;
    }
  }

  return { imageData, width, height, hasMask };
}
// ─── Кодер ───────────────────────────────────────────────────────────────────

/**
 * Кодирует ImageData в ArrayBuffer формата GB7.
 * @param {ImageData} imageData
 * @returns {ArrayBuffer}
 */
export function encodeGB7(imageData) {
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  // Проверяем наличие маски за один проход
  let hasMask = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) { hasMask = true; break; }
  }

  const buf = new ArrayBuffer(HEADER_SIZE + pixelCount);
  const out = new Uint8Array(buf);

  // Заголовок
  out[0] = 0x47; out[1] = 0x42; out[2] = 0x37; out[3] = 0x1d;
  out[4] = 0x01;
  out[5] = hasMask ? 0x01 : 0x00;
  out[6] = (width  >> 8) & 0xff; out[7] = width  & 0xff;
  out[8] = (height >> 8) & 0xff; out[9] = height & 0xff;
  out[10] = 0x00; out[11] = 0x00;

  // Пиксели: BT.601 целочисленная аппроксимация (77R + 150G + 29B) >> 8
  // Точность: максимальная ошибка ≤ 1 по сравнению с float-вариантом
  if (hasMask) {
    for (let i = 0; i < pixelCount; i++) {
      const o    = i * 4;
      const gray = ENCODE_LUT[(77 * data[o] + 150 * data[o + 1] + 29 * data[o + 2]) >> 8];
      const mask = data[o + 3] >> 7; // 1 если alpha >= 128, иначе 0
      out[HEADER_SIZE + i] = (mask << 7) | gray;
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      const o = i * 4;
      out[HEADER_SIZE + i] = ENCODE_LUT[(77 * data[o] + 150 * data[o + 1] + 29 * data[o + 2]) >> 8];
    }
  }

  return buf;
}

// ─── Метаданные ──────────────────────────────────────────────────────────────

/**
 * Читает метаданные GB7 без декодирования пикселей.
 * @param {ArrayBuffer} buffer
 */
export function peekGB7(buffer) {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error('не GB7-файл');
  }
  return {
    version: bytes[4],
    hasMask: (bytes[5] & 0x01) === 1,
    width:   (bytes[6] << 8) | bytes[7],
    height:  (bytes[8] << 8) | bytes[9],
  };
}