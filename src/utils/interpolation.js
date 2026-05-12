// ─── Методы двумерной интерполяции ───────────────────────────────────────────
//
// Каждый метод принимает:
//   srcData  — Uint8ClampedArray исходного RGBA-изображения
//   srcW/srcH — размеры источника
//   dstW/dstH — размеры результата
// Возвращает новый ImageData.

// ── Метод ближайшего соседа ───────────────────────────────────────────────────
export function nearestNeighbor(srcData, srcW, srcH, dstW, dstH) {
  const dst    = new Uint8ClampedArray(dstW * dstH * 4);
  const xScale = srcW / dstW;
  const yScale = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    // Смещаем на 0.5 чтобы брать центр ячейки, не левый верхний угол
    const sy = Math.min(srcH - 1, Math.floor((y + 0.5) * yScale));
    const rowSrc = sy * srcW;
    const rowDst = y  * dstW;
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x + 0.5) * xScale));
      const si = (rowSrc + sx) * 4;
      const di = (rowDst + x)  * 4;
      dst[di]     = srcData[si];
      dst[di + 1] = srcData[si + 1];
      dst[di + 2] = srcData[si + 2];
      dst[di + 3] = srcData[si + 3];
    }
  }
  return new ImageData(dst, dstW, dstH);
}

// ── Билинейная интерполяция ───────────────────────────────────────────────────
export function bilinear(srcData, srcW, srcH, dstW, dstH) {
  const dst    = new Uint8ClampedArray(dstW * dstH * 4);
  const xScale = srcW / dstW;
  const yScale = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    // Координата в системе источника с выравниванием по центру пикселя
    const sy  = (y + 0.5) * yScale - 0.5;
    const y0  = Math.max(0, Math.floor(sy));
    const y1  = Math.min(srcH - 1, y0 + 1);
    const fy  = sy - y0;
    const ify = 1 - fy;

    for (let x = 0; x < dstW; x++) {
      const sx  = (x + 0.5) * xScale - 0.5;
      const x0  = Math.max(0, Math.floor(sx));
      const x1  = Math.min(srcW - 1, x0 + 1);
      const fx  = sx - x0;
      const ifx = 1 - fx;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const w00 = ifx * ify;
      const w10 = fx  * ify;
      const w01 = ifx * fy;
      const w11 = fx  * fy;

      const di = (y * dstW + x) * 4;
      // Uint8ClampedArray автоматически округляет и зажимает в 0–255
      dst[di]     = w00*srcData[i00]   + w10*srcData[i10]   + w01*srcData[i01]   + w11*srcData[i11];
      dst[di + 1] = w00*srcData[i00+1] + w10*srcData[i10+1] + w01*srcData[i01+1] + w11*srcData[i11+1];
      dst[di + 2] = w00*srcData[i00+2] + w10*srcData[i10+2] + w01*srcData[i01+2] + w11*srcData[i11+2];
      dst[di + 3] = w00*srcData[i00+3] + w10*srcData[i10+3] + w01*srcData[i01+3] + w11*srcData[i11+3];
    }
  }
  return new ImageData(dst, dstW, dstH);
}

// ─── Реестр методов ───────────────────────────────────────────────────────────
// Чтобы добавить новый метод — достаточно добавить запись сюда.
export const INTERPOLATION_METHODS = [
  {
    id:         'bilinear',
    nameKey:    'resize.bilinear',
    tooltipKey: 'resize.bilinearTip',
    fn:         bilinear,
  },
  {
    id:         'nearest',
    nameKey:    'resize.nearest',
    tooltipKey: 'resize.nearestTip',
    fn:         nearestNeighbor,
  },
];

// ─── Публичный API ────────────────────────────────────────────────────────────
/**
 * Масштабирует ImageData до заданных размеров.
 * @param {ImageData} imageData
 * @param {number} dstW
 * @param {number} dstH
 * @param {string} [methodId='bilinear']
 * @returns {ImageData}
 */
export function resizeImage(imageData, dstW, dstH, methodId = 'bilinear') {
  const method = INTERPOLATION_METHODS.find(m => m.id === methodId)
    ?? INTERPOLATION_METHODS[0];
  return method.fn(imageData.data, imageData.width, imageData.height, dstW, dstH);
}
