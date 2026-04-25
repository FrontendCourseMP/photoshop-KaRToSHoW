import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { buildHistogram, normalizeHistogram } from '../../utils/histogram';
import { buildLUT } from '../../utils/levels';

const DEFAULT_LEVELS = {
  master: { black: 0, gamma: 1.0, white: 255 },
  R:      { black: 0, gamma: 1.0, white: 255 },
  G:      { black: 0, gamma: 1.0, white: 255 },
  B:      { black: 0, gamma: 1.0, white: 255 },
  A:      { black: 0, gamma: 1.0, white: 255 },
};

const CHANNEL_COLORS = {
  master: { stroke: '#6480ff', glow: 'rgba(100,128,255,0.35)' },
  R:      { stroke: '#ff3030', glow: 'rgba(255,60,60,0.35)'   },
  G:      { stroke: '#20c020', glow: 'rgba(40,200,40,0.35)'   },
  B:      { stroke: '#2080ff', glow: 'rgba(40,130,255,0.35)'  },
  A:      { stroke: '#909090', glow: 'rgba(160,160,160,0.35)' },
};

/**
 * The input value that maps to output=0.5 (mid-gray) given gamma.
 * Solving: ((x - black)/(white - black))^(1/gamma) = 0.5
 *      →   (x - black)/(white - black) = 0.5^gamma
 */
function gammaToPos(black, white, gamma) {
  return black + (white - black) * Math.pow(0.5, gamma);
}

/**
 * Given a drag position (as an input value in [black,white]),
 * recover the gamma that would place the mid-point there.
 * Solving: t = 0.5^gamma  →  gamma = log(t)/log(0.5)
 */
function posToGamma(pos, black, white) {
  const range = Math.max(1, white - black);
  const t = Math.max(0.0001, Math.min(0.9999, (pos - black) / range));
  return Math.max(0.1, Math.min(9.9, Math.log(t) / Math.log(0.5)));
}

/**
 * Compose LUTs: master → individual channel.
 * Applying master first then per-channel lets both adjustments coexist.
 */
function buildComposedLUTs(lv) {
  const mLUT  = buildLUT(lv.master.black, lv.master.gamma, lv.master.white);
  const rLUT  = buildLUT(lv.R.black, lv.R.gamma, lv.R.white);
  const gLUT  = buildLUT(lv.G.black, lv.G.gamma, lv.G.white);
  const bLUT  = buildLUT(lv.B.black, lv.B.gamma, lv.B.white);
  const aLUT  = buildLUT(lv.A.black, lv.A.gamma, lv.A.white);

  const lutR = new Uint8ClampedArray(256);
  const lutG = new Uint8ClampedArray(256);
  const lutB = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lutR[i] = rLUT[mLUT[i]];
    lutG[i] = gLUT[mLUT[i]];
    lutB[i] = bLUT[mLUT[i]];
  }
  return { lutR, lutG, lutB, lutA: aLUT };
}

function applyLUTs(src, { lutR, lutG, lutB, lutA }) {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    out[i]     = lutR[src[i]];
    out[i + 1] = lutG[src[i + 1]];
    out[i + 2] = lutB[src[i + 2]];
    out[i + 3] = lutA[src[i + 3]];
  }
  return out;
}

export default function LevelsDialog({ t, originalImageData, canvasRef, onClose, onApply }) {
  const histCanvasRef = useRef(null);
  const rafIdRef      = useRef(null);

  const [activeChannel, setActiveChannel] = useState('master');
  const [levels,        setLevels]        = useState(() => JSON.parse(JSON.stringify(DEFAULT_LEVELS)));
  const [showPreview,   setShowPreview]   = useState(true);
  const [histScale,     setHistScale]     = useState('linear');
  const [dragging,      setDragging]      = useState(null); // 'black' | 'gamma' | 'white'
  const [isDirty,       setIsDirty]       = useState(false);

  // Refs so callbacks never go stale
  const currentLevelRef   = useRef(levels[activeChannel]);
  const activeChannelRef  = useRef(activeChannel);
  const levelsRef         = useRef(levels);

  useEffect(() => { currentLevelRef.current  = levels[activeChannel]; }, [levels, activeChannel]);
  useEffect(() => { activeChannelRef.current = activeChannel;          }, [activeChannel]);
  useEffect(() => { levelsRef.current        = levels;                 }, [levels]);

  // ── Histogram ──────────────────────────────────────────────────────────────
  const histogram = useMemo(() => {
    if (!originalImageData) return null;
    const ch = activeChannel === 'master' ? 'luminance' : activeChannel;
    return buildHistogram(originalImageData, ch);
  }, [originalImageData, activeChannel]);

  const normalizedHist = useMemo(
    () => histogram ? normalizeHistogram(histogram, histScale) : null,
    [histogram, histScale],
  );

  const currentLevels = useMemo(() => levels[activeChannel], [levels, activeChannel]);

  // ── Draw histogram canvas ──────────────────────────────────────────────────
  useEffect(() => {
    if (!normalizedHist || !histCanvasRef.current) return;
    const canvas = histCanvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const color = CHANNEL_COLORS[activeChannel];

    // Background
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f0f14');
    bg.addColorStop(1, '#0a0a0d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.save();
    for (let i = 1; i < 4; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo((W / 4) * i, 0); ctx.lineTo((W / 4) * i, H); ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath(); ctx.moveTo(0, (H / 4) * i); ctx.lineTo(W, (H / 4) * i); ctx.stroke();
    }
    ctx.restore();

    // Smooth bars with 3-tap Gaussian
    const sm = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      sm[i] = normalizedHist[Math.max(0, i - 1)] * 0.25
            + normalizedHist[i]                   * 0.50
            + normalizedHist[Math.min(255, i + 1)] * 0.25;
    }

    const MARKER_H = 14;      // px reserved at bottom for marker triangles
    const drawH    = H - MARKER_H;

    // Fill
    const fillGrad = ctx.createLinearGradient(0, 0, 0, drawH);
    fillGrad.addColorStop(0,   color.glow.replace('0.35', '0.55'));
    fillGrad.addColorStop(0.6, color.glow.replace('0.35', '0.18'));
    fillGrad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(0, drawH);
    for (let i = 0; i < 256; i++) {
      const x  = (i / 255) * W;
      const y  = drawH - sm[i] * drawH;
      const px = ((i - 1) / 255) * W;
      if (i === 0) { ctx.lineTo(x, y); continue; }
      const cpx = px + (x - px) / 3;
      ctx.bezierCurveTo(cpx, drawH - sm[Math.max(0, i - 1)] * drawH, x - (x - px) / 3, y, x, y);
    }
    ctx.lineTo(W, drawH);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke
    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(0, drawH - sm[0] * drawH);
    for (let i = 1; i < 256; i++) {
      const x  = (i / 255) * W;
      const y  = drawH - sm[i] * drawH;
      const px = ((i - 1) / 255) * W;
      const cpx = px + (x - px) / 3;
      ctx.bezierCurveTo(cpx, drawH - sm[Math.max(0, i - 1)] * drawH, x - (x - px) / 3, y, x, y);
    }
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── Marker positions ───────────────────────────────────────────────────
    const { black, white, gamma } = currentLevels;
    const blackX = (black / 255) * W;
    const whiteX = (white / 255) * W;
    const gammaX = (gammaToPos(black, white, gamma) / 255) * W;

    const TRI = 7;          // half-width of triangle base
    const TH  = 10;         // triangle height
    const TY  = H;          // y of triangle tip (bottom)

    const drawRule = (x, col) => {
      ctx.save();
      ctx.strokeStyle  = col;
      ctx.globalAlpha  = 0.28;
      ctx.lineWidth    = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, drawH); ctx.stroke();
      ctx.restore();
    };

    const drawTriangle = (x, fill, stroke, shadowCol, shadowBlur, narrow = false) => {
      const hw = narrow ? TRI - 1 : TRI;
      ctx.save();
      ctx.shadowColor = shadowCol;
      ctx.shadowBlur  = shadowBlur;
      ctx.beginPath();
      ctx.moveTo(x, TY);
      ctx.lineTo(x - hw, TY - TH);
      ctx.lineTo(x + hw, TY - TH);
      ctx.closePath();
      ctx.fillStyle   = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    // Clipping overlays
    if (black > 0) {
      const g = ctx.createLinearGradient(0, 0, Math.min(blackX, 30), 0);
      g.addColorStop(0, 'rgba(80,80,255,0.25)');
      g.addColorStop(1, 'rgba(80,80,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, blackX, drawH);
    }
    if (white < 255) {
      const g = ctx.createLinearGradient(whiteX, 0, W, 0);
      g.addColorStop(0, 'rgba(255,80,80,0)');
      g.addColorStop(1, 'rgba(255,80,80,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(whiteX, 0, W - whiteX, drawH);
    }

    // Black marker
    drawRule(blackX, '#ffffff');
    drawTriangle(blackX, '#111', 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0.8)', 4);

    // White marker
    drawRule(whiteX, '#ffffff');
    drawTriangle(whiteX, '#eee', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.4)', 6);

    // Gamma marker (narrower, gray)
    drawRule(gammaX, '#aaaaaa');
    drawTriangle(gammaX, '#888', 'rgba(255,255,255,0.55)', 'rgba(200,200,200,0.5)', 5, true);

  }, [normalizedHist, currentLevels, activeChannel]);

  // ── Level change helpers ───────────────────────────────────────────────────
  const handleLevelChange = useCallback((key, rawValue) => {
    const v = Math.max(0, Math.min(255, Math.round(Number(rawValue))));
    setLevels(prev => ({
      ...prev,
      [activeChannelRef.current]: { ...prev[activeChannelRef.current], [key]: v },
    }));
    setIsDirty(true);
  }, []);

  const handleGammaChange = useCallback((rawValue) => {
    const v = Math.max(0.1, Math.min(9.9, parseFloat(parseFloat(rawValue).toFixed(2))));
    setLevels(prev => ({
      ...prev,
      [activeChannelRef.current]: { ...prev[activeChannelRef.current], gamma: v },
    }));
    setIsDirty(true);
  }, []);

  // ── Histogram drag (black / gamma / white) ─────────────────────────────────
  const handleHistMouseDown = useCallback((e) => {
    if (!histCanvasRef.current) return;
    const rect = histCanvasRef.current.getBoundingClientRect();
    const v    = ((e.clientX - rect.left) / rect.width) * 255;
    const { black, white, gamma } = currentLevelRef.current;
    const gPos = gammaToPos(black, white, gamma);
    const dB   = Math.abs(v - black);
    const dG   = Math.abs(v - gPos);
    const dW   = Math.abs(v - white);
    const minD = Math.min(dB, dG, dW);
    setDragging(minD === dB ? 'black' : minD === dW ? 'white' : 'gamma');
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      if (!histCanvasRef.current) return;
      const rect = histCanvasRef.current.getBoundingClientRect();
      const v    = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)) * 255;
      const cur  = currentLevelRef.current;

      if (dragging === 'black') {
        handleLevelChange('black', Math.min(v, cur.white - 1));
      } else if (dragging === 'white') {
        handleLevelChange('white', Math.max(v, cur.black + 1));
      } else {
        handleGammaChange(posToGamma(v, cur.black, cur.white));
      }
    };

    const onUp = () => setDragging(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, [dragging, handleLevelChange, handleGammaChange]);

  // ── Live preview via requestAnimationFrame ─────────────────────────────────
  const applyToCanvas = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    const luts = buildComposedLUTs(levelsRef.current);
    const out  = applyLUTs(originalImageData.data, luts);
    canvasRef.current
      .getContext('2d')
      .putImageData(new ImageData(out, originalImageData.width, originalImageData.height), 0, 0);
  }, [originalImageData, canvasRef]);

  useEffect(() => {
    if (!showPreview) return;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      applyToCanvas();
      rafIdRef.current = null;
    });
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [levels, showPreview, applyToCanvas]);

  // ── Restore original when preview is toggled off ───────────────────────────
  const restoreOriginal = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    canvasRef.current
      .getContext('2d')
      .putImageData(
        new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height),
        0, 0,
      );
  }, [originalImageData, canvasRef]);

  // ── Buttons ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setLevels(JSON.parse(JSON.stringify(DEFAULT_LEVELS)));
    setIsDirty(false);
  };

  const handleCancel = () => {
    restoreOriginal();
    onClose();
  };

  const handleApply = () => {
    if (originalImageData && canvasRef.current) {
      const luts   = buildComposedLUTs(levels);
      const out    = applyLUTs(originalImageData.data, luts);
      const result = new ImageData(out, originalImageData.width, originalImageData.height);
      canvasRef.current.getContext('2d').putImageData(result, 0, 0);
      onApply?.(result);
    }
    onClose();
  };

  if (!originalImageData) {
    return (
      <dialog className="dialog dialog--levels" open>
        <div className="dialog__content">
          <h2>{t('levels.title')}</h2>
          <p style={{ color: 'var(--c-text-2)', fontSize: 12 }}>{t('status.noFile')}</p>
          <button className="btn btn--secondary" onClick={onClose}>{t('menu.close')}</button>
        </div>
      </dialog>
    );
  }

  return (
    <dialog className="dialog dialog--levels" open>
      <div className="dialog__content">

        {/* ── Header ── */}
        <div className="dialog__header">
          <h2>{t('levels.title')}</h2>
          {isDirty && <span className="levels__dirty-badge" title="Unsaved changes">●</span>}
        </div>

        {/* ── Channel tabs ── */}
        <div className="levels__section">
          <label>{t('levels.channel')}</label>
          <div className="levels__channel-tabs">
            {(['master', 'R', 'G', 'B', 'A']).map(ch => (
              <button
                key={ch}
                className={`levels__ch-tab${activeChannel === ch ? ' levels__ch-tab--active' : ''}`}
                data-ch={ch}
                onClick={() => setActiveChannel(ch)}
                style={activeChannel === ch ? { '--tab-color': CHANNEL_COLORS[ch].stroke } : {}}
              >
                {ch === 'master' ? t('levels.master')
                  : ch === 'R'  ? t('channels.red')
                  : ch === 'G'  ? t('channels.green')
                  : ch === 'B'  ? t('channels.blue')
                  :               t('channels.alpha')}
              </button>
            ))}
          </div>
        </div>

        {/* ── Histogram ── */}
        <div className="levels__section">
          <div className="levels__hist-controls">
            <label>{t('levels.histogram')}</label>
            <div className="levels__scale-tabs">
              {(['linear', 'log']).map(s => (
                <button
                  key={s}
                  className={`levels__scale-btn${histScale === s ? ' levels__scale-btn--active' : ''}`}
                  onClick={() => setHistScale(s)}
                >
                  {s === 'linear' ? t('levels.linear') : t('levels.logarithmic')}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`levels__hist-wrap${dragging ? ' levels__hist-wrap--dragging' : ''}`}
            onMouseDown={handleHistMouseDown}
          >
            <canvas ref={histCanvasRef} className="levels__histogram" width={340} height={168} />
            <div className="levels__hist-labels">
              <span>0</span><span>64</span><span>128</span><span>192</span><span>255</span>
            </div>
            <div className="levels__hist-legend">
              <span className="levels__hist-legend-item levels__hist-legend-item--black" />
              <span className="levels__hist-legend-item levels__hist-legend-item--gamma" />
              <span className="levels__hist-legend-item levels__hist-legend-item--white" />
            </div>
          </div>
        </div>

        {/* ── Input levels ── */}
        <div className="levels__section">
          <label>{t('levels.inputLevels')}</label>
          <div className="levels__sliders">

            {/* Black */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot levels__slider-dot--black" />
              <label className="levels__slider-label">{t('levels.black')}</label>
              <input
                type="range" min="0" max="254"
                value={currentLevels.black}
                onChange={e => handleLevelChange('black', Math.min(+e.target.value, currentLevels.white - 1))}
                className="levels__slider levels__slider--dark"
              />
              <input
                type="number" min="0" max="254"
                value={currentLevels.black}
                onChange={e => handleLevelChange('black', Math.min(+e.target.value || 0, currentLevels.white - 1))}
                className="levels__number-input"
              />
            </div>

            {/* Gamma */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot levels__slider-dot--gamma" />
              <label className="levels__slider-label">{t('levels.gamma')}</label>
              <input
                type="range" min="0.10" max="9.90" step="0.05"
                value={currentLevels.gamma}
                onChange={e => handleGammaChange(e.target.value)}
                className="levels__slider levels__slider--gamma"
              />
              <input
                type="number" min="0.10" max="9.90" step="0.10"
                value={currentLevels.gamma.toFixed(2)}
                onChange={e => handleGammaChange(e.target.value)}
                className="levels__number-input"
              />
            </div>

            {/* White */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot levels__slider-dot--white" />
              <label className="levels__slider-label">{t('levels.white')}</label>
              <input
                type="range" min="1" max="255"
                value={currentLevels.white}
                onChange={e => handleLevelChange('white', Math.max(+e.target.value, currentLevels.black + 1))}
                className="levels__slider levels__slider--light"
              />
              <input
                type="number" min="1" max="255"
                value={currentLevels.white}
                onChange={e => handleLevelChange('white', Math.max(+e.target.value || 255, currentLevels.black + 1))}
                className="levels__number-input"
              />
            </div>
          </div>
        </div>

        {/* ── Preview checkbox ── */}
        <div className="levels__section levels__section--row">
          <label className="levels__checkbox">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={e => {
                setShowPreview(e.target.checked);
                if (!e.target.checked) restoreOriginal();
              }}
            />
            {t('levels.preview')}
          </label>
        </div>

        {/* ── Buttons ── */}
        <div className="dialog__buttons">
          <button className="btn btn--ghost" onClick={handleReset}>{t('levels.reset')}</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={handleCancel}>{t('levels.cancel')}</button>
          <button className="btn btn--primary"   onClick={handleApply}>{t('levels.apply')}</button>
        </div>

      </div>
    </dialog>
  );
}
