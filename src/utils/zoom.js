// Границы масштаба для области просмотра
export const MIN_ZOOM = 0.03;
export const MAX_ZOOM = 32;
export const ZOOM_FACTOR = 1.2;

// Пресеты zoom для быстрого выбора
export const ZOOM_PRESETS = [
  { label: '10%',  v: 0.10 },
  { label: '25%',  v: 0.25 },
  { label: '50%',  v: 0.50 },
  { label: '75%',  v: 0.75 },
  { label: '100%', v: 1.00 },
  { label: '150%', v: 1.50 },
  { label: '200%', v: 2.00 },
  { label: '400%', v: 4.00 },
  { label: '800%', v: 8.00 },
];

// Ограничивает значение масштаба в пределах MIN_ZOOM и MAX_ZOOM
export function clamp(v, lo = MIN_ZOOM, hi = MAX_ZOOM) {
  return Math.min(hi, Math.max(lo, v));
}

// Форматирует число масштаба в строку процента
export function formatZoom(z) {
  return `${Math.round(z * 100)}%`;
}

// Масштабирует изображение относительно точки курсора и сохраняет позицию
export function zoomToward(zoom, offset, px, py, factor) {
  const nz = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const cx = (px - offset.x) / zoom;
  const cy = (py - offset.y) / zoom;
  return { zoom: nz, offset: { x: px - cx * nz, y: py - cy * nz } };
}

// Центрирует изображение в окне просмотра при заданном масштабе
export function centerOffset(vpW, vpH, imgW, imgH, zoom) {
  return { x: (vpW - imgW * zoom) / 2, y: (vpH - imgH * zoom) / 2 };
}

// Рассчитывает подходящий масштаб, чтобы изображение уместилось во viewport
export function fitZoom(vpW, vpH, imgW, imgH) {
  const pad = 48;
  return clamp(Math.min((vpW - pad) / imgW, (vpH - pad) / imgH), MIN_ZOOM, MAX_ZOOM);
}

// Рассчитывает масштаб, при котором изображение заполняет весь viewport
export function fillZoom(vpW, vpH, imgW, imgH) {
  return clamp(Math.max(vpW / imgW, vpH / imgH), MIN_ZOOM, MAX_ZOOM);
}
