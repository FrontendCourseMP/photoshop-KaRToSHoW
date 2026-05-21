/**
 * Web Worker: applies 3×3 kernel convolution to RGBA image data.
 * Receives: { data, width, height, kernelVals, divisor, channels, edgeHandling }
 * Sends:    { result } — Uint8ClampedArray transferred back
 */

function padImage(srcData, w, h, strategy) {
  const pw = w + 2;
  const ph = h + 2;
  const out = new Uint8ClampedArray(pw * ph * 4);

  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      let srcX = px - 1;
      let srcY = py - 1;
      const outIdx = (py * pw + px) * 4;

      if (strategy === 'copy') {
        srcX = Math.max(0, Math.min(w - 1, srcX));
        srcY = Math.max(0, Math.min(h - 1, srcY));
        const idx = (srcY * w + srcX) * 4;
        out[outIdx]     = srcData[idx];
        out[outIdx + 1] = srcData[idx + 1];
        out[outIdx + 2] = srcData[idx + 2];
        out[outIdx + 3] = srcData[idx + 3];
      } else if (srcX < 0 || srcX >= w || srcY < 0 || srcY >= h) {
        const fill = strategy === 'white' ? 255 : 0;
        out[outIdx]     = fill;
        out[outIdx + 1] = fill;
        out[outIdx + 2] = fill;
        out[outIdx + 3] = 255;
      } else {
        const idx = (srcY * w + srcX) * 4;
        out[outIdx]     = srcData[idx];
        out[outIdx + 1] = srcData[idx + 1];
        out[outIdx + 2] = srcData[idx + 2];
        out[outIdx + 3] = srcData[idx + 3];
      }
    }
  }

  return out;
}

self.onmessage = function (e) {
  const { data, width, height, kernelVals, divisor, channels, edgeHandling } = e.data;

  const padded = padImage(data, width, height, edgeHandling);
  const pw = width + 2;
  const out = new Uint8ClampedArray(data.length);

  const applyR = channels.includes('R');
  const applyG = channels.includes('G');
  const applyB = channels.includes('B');

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 1;
      const py = y + 1;

      let sumR = 0, sumG = 0, sumB = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const k = kernelVals[ky * 3 + kx];
          const pidx = ((py + ky - 1) * pw + (px + kx - 1)) * 4;
          sumR += padded[pidx]     * k;
          sumG += padded[pidx + 1] * k;
          sumB += padded[pidx + 2] * k;
        }
      }

      const srcIdx = (y * width + x) * 4;
      out[srcIdx]     = applyR ? Math.max(0, Math.min(255, Math.round(sumR / divisor))) : data[srcIdx];
      out[srcIdx + 1] = applyG ? Math.max(0, Math.min(255, Math.round(sumG / divisor))) : data[srcIdx + 1];
      out[srcIdx + 2] = applyB ? Math.max(0, Math.min(255, Math.round(sumB / divisor))) : data[srcIdx + 2];
      out[srcIdx + 3] = data[srcIdx + 3];
    }
  }

  self.postMessage({ result: out }, [out.buffer]);
};
