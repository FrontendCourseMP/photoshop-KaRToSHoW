/**
 * Luminance calculation for composite histogram
 * Uses standard relative luminance formula
 */
export function getLuminance(r, g, b) {
  // sRGB relative luminance
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;
  
  const rl = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gl = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bl = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Build histogram for given channel
 * @param {ImageData} imageData - source image data
 * @param {string} channel - 'luminance', 'R', 'G', 'B', 'A'
 * @returns {Uint32Array} histogram array [0..255]
 */
export function buildHistogram(imageData, channel = 'luminance') {
  const data = imageData.data;
  const hist = new Uint32Array(256);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    let value;
    if (channel === 'luminance') {
      value = Math.round(getLuminance(r, g, b) * 255);
    } else if (channel === 'R') {
      value = r;
    } else if (channel === 'G') {
      value = g;
    } else if (channel === 'B') {
      value = b;
    } else if (channel === 'A') {
      value = a;
    } else {
      value = Math.round((r + g + b) / 3); // fallback to average
    }
    
    hist[Math.min(255, Math.max(0, value))]++;
  }
  
  return hist;
}

/**
 * Normalize histogram for display (linear or logarithmic)
 * @param {Uint32Array} histogram - raw histogram
 * @param {string} scale - 'linear' or 'log'
 * @returns {Float32Array} normalized values [0..1]
 */
export function normalizeHistogram(histogram, scale = 'linear') {
  const normalized = new Float32Array(256);
  
  let maxValue = 0;
  if (scale === 'log') {
    // Log scale: find max of log-transformed values
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        maxValue = Math.max(maxValue, Math.log1p(histogram[i]));
      }
    }
  } else {
    // Linear scale: find max directly
    maxValue = Math.max(...histogram);
  }
  
  if (maxValue === 0) maxValue = 1;
  
  for (let i = 0; i < 256; i++) {
    if (scale === 'log') {
      normalized[i] = histogram[i] > 0 ? Math.log1p(histogram[i]) / maxValue : 0;
    } else {
      normalized[i] = histogram[i] / maxValue;
    }
  }
  
  return normalized;
}
