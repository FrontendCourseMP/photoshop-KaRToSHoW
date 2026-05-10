// ─── Загрузка / сохранение ────────────────────────────────────────────────────

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Анализ пикселей ──────────────────────────────────────────────────────────

// Проходит по RGBA-плоскости и возвращает сырые признаки.
function scanPixelTraits(data) {
  let isGray   = true;
  let hasAlpha = false;

  for (let i = 0; i < data.length; i += 4) {
    if (isGray && (data[i] !== data[i + 1] || data[i] !== data[i + 2]))
      isGray = false;
    if (!hasAlpha && data[i + 3] < 255)
      hasAlpha = true;
    if (!isGray && hasAlpha) break;
  }

  return { isGray, hasAlpha };
}

// Классифицирует цветовую глубину по сырым RGBA-данным пикселей.
export function sniffDepth(data) {
  const { isGray, hasAlpha } = scanPixelTraits(data);
  if (isGray && hasAlpha) return '8-bit gray + alpha';
  if (isGray)              return '8-bit grayscale';
  if (hasAlpha)            return '32-bit RGBA';
  return '24-bit RGB';
}
