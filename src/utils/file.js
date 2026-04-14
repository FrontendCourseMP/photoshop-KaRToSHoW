// Сохраняет Blob как файл, создавая временную ссылку и клик по ней
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// Определяет глубину цвета изображения по данным пикселей RGBA
export function sniffDepth(data) {
  let isGray = true;
  let hasAlpha = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) isGray = false;
    if (data[i + 3] < 255) hasAlpha = true;
    if (!isGray && hasAlpha) break;
  }
  if (isGray && hasAlpha) return '8-bit gray + alpha';
  if (isGray) return '8-bit grayscale';
  if (hasAlpha) return '32-bit RGBA';
  return '24-bit RGB';
}
