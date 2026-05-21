/**
 * Kernel convolution presets and divisor helper.
 * Each kernel is stored as a flat 9-element array (row-major, top-left to bottom-right).
 */
export const KERNEL_PRESETS = [
  { id: 'identity', kernel: [ 0,  0, 0,  0,  1,  0,  0,  0, 0] },
  { id: 'sharpen',  kernel: [ 0, -1, 0, -1,  5, -1,  0, -1, 0] },
  { id: 'gaussian', kernel: [ 1,  2, 1,  2,  4,  2,  1,  2, 1] },
  { id: 'boxBlur',  kernel: [ 1,  1, 1,  1,  1,  1,  1,  1, 1] },
  { id: 'prewittX', kernel: [-1,  0, 1, -1,  0,  1, -1,  0, 1] },
  { id: 'prewittY', kernel: [-1, -1,-1,  0,  0,  0,  1,  1, 1] },
];

/**
 * Compute the normalization divisor from kernel values.
 * Uses the sum of all values; falls back to 1 when the sum is 0 or negative
 * (e.g. Prewitt / edge-detection kernels).
 */
export function computeDivisor(kernelVals) {
  const sum = kernelVals.reduce((acc, v) => acc + v, 0);
  return sum > 0 ? sum : 1;
}
