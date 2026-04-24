/**
 * Build Look-Up Table (LUT) for levels correction
 * Maps input values [0..255] to output values [0..255]
 * 
 * @param {number} blackPoint - input black level (0-255)
 * @param {number} gamma - gamma correction (0.1-9.9), where 1.0 = linear
 * @param {number} whitePoint - input white level (0-255)
 * @param {number} outputBlack - output black (usually 0)
 * @param {number} outputWhite - output white (usually 255)
 * @returns {Uint8ClampedArray} LUT [0..255] -> [0..255]
 */
export function buildLUT(blackPoint, gamma, whitePoint, outputBlack = 0, outputWhite = 255) {
  const lut = new Uint8ClampedArray(256);
  const inputRange = whitePoint - blackPoint;
  
  for (let i = 0; i < 256; i++) {
    // Normalize input to [0..1]
    let normalized = (i - blackPoint) / inputRange;
    normalized = Math.max(0, Math.min(1, normalized));
    
    // Apply gamma correction (power function)
    let corrected;
    if (gamma === 1.0) {
      corrected = normalized;
    } else {
      corrected = Math.pow(normalized, 1 / gamma);
    }
    
    // Map to output range
    const output = outputBlack + corrected * (outputWhite - outputBlack);
    lut[i] = Math.round(Math.max(0, Math.min(255, output)));
  }
  
  return lut;
}

/**
 * Apply levels correction to image data using channel-specific LUTs
 * 
 * @param {ImageData} sourceData - original image data
 * @param {ImageData} destData - destination image data (will be modified)
 * @param {Object} lutMap - { channel: LUT } e.g., { R: lut, G: lut, B: lut, A: lut }
 * @param {boolean} applyToAllRGB - if true, use same LUT for R, G, B
 */
export function applyLevels(sourceData, destData, lutMap, applyToAllRGB = false) {
  const src = sourceData.data;
  const dst = destData.data;
  
  const lutR = applyToAllRGB ? lutMap.master : lutMap.R;
  const lutG = applyToAllRGB ? lutMap.master : lutMap.G;
  const lutB = applyToAllRGB ? lutMap.master : lutMap.B;
  const lutA = lutMap.A || null;
  
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = lutR[src[i]];         // R
    dst[i + 1] = lutG[src[i + 1]]; // G
    dst[i + 2] = lutB[src[i + 2]]; // B
    dst[i + 3] = lutA ? lutA[src[i + 3]] : src[i + 3]; // A
  }
}

/**
 * Apply levels with throttling for real-time preview
 * Returns a throttled function that will be called at most once per ~16ms (60fps)
 */
export function createThrottledApplyLevels() {
  let rafId = null;
  let pending = false;
  
  return (callback) => {
    pending = true;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        if (pending) {
          callback();
          pending = false;
        }
        rafId = null;
      });
    }
  };
}

/**
 * Validate levels parameters
 */
export function validateLevels(blackPoint, gamma, whitePoint) {
  const errors = [];
  
  if (blackPoint < 0 || blackPoint > 255) {
    errors.push('Black point must be 0-255');
  }
  if (whitePoint < 0 || whitePoint > 255) {
    errors.push('White point must be 0-255');
  }
  if (blackPoint >= whitePoint) {
    errors.push('Black point must be less than white point');
  }
  if (gamma < 0.1 || gamma > 9.9) {
    errors.push('Gamma must be 0.1-9.9');
  }
  
  return errors;
}
