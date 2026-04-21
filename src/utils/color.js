// Color conversion utilities: sRGB -> XYZ -> CIELAB
const SRGB_TO_LINEAR = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

export function rgbToXyz(r, g, b) {
  // r,g,b are 0..255
  const R = SRGB_TO_LINEAR(r / 255);
  const G = SRGB_TO_LINEAR(g / 255);
  const B = SRGB_TO_LINEAR(b / 255);
  // sRGB D65
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return { X, Y, Z };
}

function f(t) {
  return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787037 * t) + 16 / 116;
}

export function xyzToLab(X, Y, Z) {
  // Reference white D65
  const Xn = 0.95047;
  const Yn = 1.00000;
  const Zn = 1.08883;
  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);
  const L = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}

export function rgbToLab(r, g, b) {
  const { X, Y, Z } = rgbToXyz(r, g, b);
  return xyzToLab(X, Y, Z);
}

export default {
  rgbToXyz,
  xyzToLab,
  rgbToLab,
};
