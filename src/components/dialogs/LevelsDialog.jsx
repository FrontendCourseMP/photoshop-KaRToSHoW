import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { buildHistogram, normalizeHistogram } from '../../utils/histogram';
import { buildLUT, applyLevels, validateLevels, createThrottledApplyLevels } from '../../utils/levels';

const DEFAULT_LEVELS = {
  master: { black: 0, gamma: 1.0, white: 255 },
  R: { black: 0, gamma: 1.0, white: 255 },
  G: { black: 0, gamma: 1.0, white: 255 },
  B: { black: 0, gamma: 1.0, white: 255 },
  A: { black: 0, gamma: 1.0, white: 255 },
};

const CHANNEL_COLORS = {
  master: { fill: '#a0b4ff', stroke: '#6480ff', glow: 'rgba(100,128,255,0.35)' },
  R:      { fill: '#ff8080', stroke: '#ff3030', glow: 'rgba(255,60,60,0.35)' },
  G:      { fill: '#60e060', stroke: '#20c020', glow: 'rgba(40,200,40,0.35)' },
  B:      { fill: '#60aaff', stroke: '#2080ff', glow: 'rgba(40,130,255,0.35)' },
  A:      { fill: '#c0c0c0', stroke: '#909090', glow: 'rgba(160,160,160,0.35)' },
};

export default function LevelsDialog({ t, originalImageData, imageInfo, canvasRef, onClose, onApply }) {
  const dialogRef = useRef(null);
  const histCanvasRef = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeChannel, setActiveChannel] = useState('master');
  const [levels, setLevels] = useState(JSON.parse(JSON.stringify(DEFAULT_LEVELS)));
  const [showPreview, setShowPreview] = useState(true);
  const [histScale, setHistScale] = useState('linear');
  const [draggingSlider, setDraggingSlider] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Refs to avoid stale closures in drag handlers
  const currentLevelsRef = useRef(levels[activeChannel]);
  const activeChannelRef = useRef(activeChannel);
  const levelsRef = useRef(levels);

  useEffect(() => { currentLevelsRef.current = levels[activeChannel]; }, [levels, activeChannel]);
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);
  useEffect(() => { levelsRef.current = levels; }, [levels]);

  // ── Histogram data ─────────────────────────────────────────────────────────
  const histogram = useMemo(() => {
    if (!originalImageData) return null;
    const channel = activeChannel === 'master' ? 'luminance' : activeChannel;
    return buildHistogram(originalImageData, channel);
  }, [originalImageData, activeChannel]);

  const normalizedHist = useMemo(() => {
    if (!histogram) return null;
    return normalizeHistogram(histogram, histScale);
  }, [histogram, histScale]);

  const currentLevels = useMemo(() => levels[activeChannel], [levels, activeChannel]);

  // ── Draw histogram ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!normalizedHist || !histCanvasRef.current) return;

    const canvas = histCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const color = CHANNEL_COLORS[activeChannel];

    // ── Background ──
    ctx.clearRect(0, 0, W, H);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f0f14');
    bgGrad.addColorStop(1, '#0a0a0d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Grid lines ──
    ctx.save();
    for (let i = 1; i < 4; i++) {
      const x = (W / 4) * i;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const y = (H / 4) * i;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // ── Smooth histogram curve ──
    // Build smooth points with a simple 3-tap Gaussian pass
    const smooth = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const l = normalizedHist[Math.max(0, i - 1)];
      const c = normalizedHist[i];
      const r = normalizedHist[Math.min(255, i + 1)];
      smooth[i] = l * 0.25 + c * 0.5 + r * 0.25;
    }

    const MARKER_AREA = 14; // pixels reserved at bottom for markers
    const drawH = H - MARKER_AREA;

    // Fill gradient
    const fillGrad = ctx.createLinearGradient(0, 0, 0, drawH);
    fillGrad.addColorStop(0, color.glow.replace('0.35', '0.55'));
    fillGrad.addColorStop(0.6, color.glow.replace('0.35', '0.18'));
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(0, drawH);

    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * W;
      const y = drawH - smooth[i] * drawH;
      if (i === 0) ctx.lineTo(x, y);
      else {
        // Catmull-Rom smooth steps
        const px = ((i - 1) / 255) * W;
        const cpx = px + (x - px) / 3;
        ctx.bezierCurveTo(cpx, drawH - smooth[Math.max(0, i - 1)] * drawH,
                          x - (x - px) / 3, y,
                          x, y);
      }
    }
    ctx.lineTo(W, drawH);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke line (glow pass then crisp pass)
    ctx.save();
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, drawH - smooth[0] * drawH);
    for (let i = 1; i < 256; i++) {
      const x = (i / 255) * W;
      const y = drawH - smooth[i] * drawH;
      const px = ((i - 1) / 255) * W;
      const cpx = px + (x - px) / 3;
      ctx.bezierCurveTo(cpx, drawH - smooth[Math.max(0, i - 1)] * drawH,
                        x - (x - px) / 3, y,
                        x, y);
    }
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── Input-level markers ────────────────────────────────────────────────
    const { black, white, gamma } = currentLevels;
    const blackX = (black / 255) * W;
    const whiteX = (white / 255) * W;

    // Gamma midpoint: position between black and white on a log scale
    const mid = black + (white - black) * (1 - Math.pow(2, -Math.log2(gamma) * 0.5 + 0.5));
    const gammaX = ((black + white) / 2 / 255) * W; // visual midpoint

    const TRI = 7;  // triangle half-width
    const TH  = 10; // triangle height
    const TY  = H;  // base of triangles

    // Draw a coloured vertical rule for each
    const drawRule = (x, col) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, drawH);
      ctx.stroke();
      ctx.restore();
    };

    // Black point
    drawRule(blackX, '#ffffff');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(blackX, TY);
    ctx.lineTo(blackX - TRI, TY - TH);
    ctx.lineTo(blackX + TRI, TY - TH);
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // White point
    drawRule(whiteX, '#ffffff');
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(whiteX, TY);
    ctx.lineTo(whiteX - TRI, TY - TH);
    ctx.lineTo(whiteX + TRI, TY - TH);
    ctx.closePath();
    ctx.fillStyle = '#eee';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Gamma midpoint diamond
    const midX = (blackX + whiteX) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(200,200,200,0.5)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(midX, TY - TH - 2);
    ctx.lineTo(midX - 5, TY - TH / 2 - 2);
    ctx.lineTo(midX, TY - 2);
    ctx.lineTo(midX + 5, TY - TH / 2 - 2);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // ── Clipping indicator bars ──────────────────────────────────────────
    // Thin strip at very left/right showing shadow/highlight clipping
    if (black > 0) {
      const clipGrad = ctx.createLinearGradient(0, 0, Math.min(blackX, 30), 0);
      clipGrad.addColorStop(0, 'rgba(80,80,255,0.25)');
      clipGrad.addColorStop(1, 'rgba(80,80,255,0)');
      ctx.fillStyle = clipGrad;
      ctx.fillRect(0, 0, blackX, drawH);
    }
    if (white < 255) {
      const cRight = W - whiteX;
      const clipGrad = ctx.createLinearGradient(whiteX, 0, W, 0);
      clipGrad.addColorStop(0, 'rgba(255,80,80,0)');
      clipGrad.addColorStop(1, 'rgba(255,80,80,0.25)');
      ctx.fillStyle = clipGrad;
      ctx.fillRect(whiteX, 0, cRight, drawH);
    }

  }, [normalizedHist, currentLevels, activeChannel]);

  // ── Level changes (stable callbacks) ─────────────────────────────────────
  const handleLevelChange = useCallback((key, rawValue) => {
    const value = Math.max(0, Math.min(255, Math.round(Number(rawValue))));
    setLevels(prev => ({
      ...prev,
      [activeChannelRef.current]: {
        ...prev[activeChannelRef.current],
        [key]: value,
      },
    }));
    setIsDirty(true);
  }, []); // no deps — reads channel via ref

  const handleGammaChange = useCallback((rawValue) => {
    const value = Math.max(0.1, Math.min(9.9, parseFloat(parseFloat(rawValue).toFixed(2))));
    setLevels(prev => ({
      ...prev,
      [activeChannelRef.current]: {
        ...prev[activeChannelRef.current],
        gamma: value,
      },
    }));
    setIsDirty(true);
  }, []);

  // ── Histogram drag for black/white points ─────────────────────────────────
  const handleSliderMouseDown = useCallback((sliderType) => (e) => {
    e.preventDefault();
    setDraggingSlider(sliderType);
  }, []);

  useEffect(() => {
    if (!draggingSlider) return;

    const handleMouseMove = (e) => {
      if (!histCanvasRef.current) return;
      const rect = histCanvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const value = (x / rect.width) * 255;
      const cur = currentLevelsRef.current;

      if (draggingSlider === 'black') {
        handleLevelChange('black', Math.min(value, cur.white - 1));
      } else if (draggingSlider === 'white') {
        handleLevelChange('white', Math.max(value, cur.black + 1));
      }
    };

    const handleMouseUp = () => setDraggingSlider(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingSlider, handleLevelChange]); // handleLevelChange is stable, draggingSlider changes only on down/up

  // ── Canvas preview (throttled) ─────────────────────────────────────────────
  const throttledApply = useMemo(() => createThrottledApplyLevels(), []);

  const applyLevelsToCanvas = useCallback(() => {
    if (!originalImageData || !canvasRef.current || !showPreview) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const displayed = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const lv = levelsRef.current;
    const isMaster = activeChannelRef.current === 'master';

    const lutMap = isMaster
      ? { master: buildLUT(lv.master.black, lv.master.gamma, lv.master.white),
          A: buildLUT(lv.A.black, lv.A.gamma, lv.A.white) }
      : { R: buildLUT(lv.R.black, lv.R.gamma, lv.R.white),
          G: buildLUT(lv.G.black, lv.G.gamma, lv.G.white),
          B: buildLUT(lv.B.black, lv.B.gamma, lv.B.white),
          A: buildLUT(lv.A.black, lv.A.gamma, lv.A.white),
          master: null };

    applyLevels(originalImageData, displayed, lutMap, isMaster);
    ctx.putImageData(displayed, 0, 0);
  }, [originalImageData, canvasRef, showPreview]);

  useEffect(() => {
    throttledApply(() => applyLevelsToCanvas());
  }, [levels, showPreview, throttledApply, applyLevelsToCanvas]);

  // ── Reset / Cancel / Apply ────────────────────────────────────────────────
  const handleReset = () => {
    setLevels(JSON.parse(JSON.stringify(DEFAULT_LEVELS)));
    setShowPreview(true);
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (originalImageData && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height),
        0, 0
      );
    }
    onClose();
  };

  const handleApply = () => {
    if (originalImageData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const displayed = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const lv = levels;
      const isMaster = activeChannel === 'master';

      const lutMap = isMaster
        ? { master: buildLUT(lv.master.black, lv.master.gamma, lv.master.white),
            A: buildLUT(lv.A.black, lv.A.gamma, lv.A.white) }
        : { R: buildLUT(lv.R.black, lv.R.gamma, lv.R.white),
            G: buildLUT(lv.G.black, lv.G.gamma, lv.G.white),
            B: buildLUT(lv.B.black, lv.B.gamma, lv.B.white),
            A: buildLUT(lv.A.black, lv.A.gamma, lv.A.white),
            master: null };

      applyLevels(originalImageData, displayed, lutMap, isMaster);
      ctx.putImageData(displayed, 0, 0);
      onApply?.(displayed);
    }
    onClose();
  };

  // ── No image guard ─────────────────────────────────────────────────────────
  if (!originalImageData) {
    return (
      <dialog ref={dialogRef} className="dialog dialog--levels" open>
        <div className="dialog__content">
          <h2>{t('levels.title')}</h2>
          <p>{t('status.noFile')}</p>
          <button onClick={onClose}>{t('menu.close')}</button>
        </div>
      </dialog>
    );
  }

  const channelColor = CHANNEL_COLORS[activeChannel].stroke;

  return (
    <dialog ref={dialogRef} className="dialog dialog--levels" open>
      <div className="dialog__content">
        <div className="dialog__header">
          <h2>{t('levels.title')}</h2>
          {isDirty && <span className="levels__dirty-badge">●</span>}
        </div>

        {/* Channel selector */}
        <div className="levels__section">
          <label>{t('levels.channel')}</label>
          <div className="levels__channel-tabs">
            {['master', 'R', 'G', 'B', 'A'].map(ch => (
              <button
                key={ch}
                className={`levels__ch-tab ${activeChannel === ch ? 'levels__ch-tab--active' : ''}`}
                data-ch={ch}
                onClick={() => setActiveChannel(ch)}
                style={activeChannel === ch ? { '--tab-color': CHANNEL_COLORS[ch].stroke } : {}}
              >
                {ch === 'master' ? t('levels.master') : t(`channels.${ch === 'R' ? 'red' : ch === 'G' ? 'green' : ch === 'B' ? 'blue' : 'alpha'}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Histogram */}
        <div className="levels__section">
          <div className="levels__hist-controls">
            <label>{t('levels.histogram')}</label>
            <div className="levels__scale-tabs">
              {['linear', 'log'].map(s => (
                <button
                  key={s}
                  className={`levels__scale-btn ${histScale === s ? 'levels__scale-btn--active' : ''}`}
                  onClick={() => setHistScale(s)}
                >
                  {s === 'linear' ? t('levels.linear') : t('levels.logarithmic')}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`levels__hist-wrap ${draggingSlider ? 'levels__hist-wrap--dragging' : ''}`}
            onMouseDown={(e) => {
              if (!histCanvasRef.current) return;
              const rect = histCanvasRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const v = (x / rect.width) * 255;
              const { black, white } = currentLevelsRef.current;
              const distBlack = Math.abs(v - black);
              const distWhite = Math.abs(v - white);
              const target = distBlack < distWhite ? 'black' : 'white';
              setDraggingSlider(target);
              e.preventDefault();
            }}
          >
            <canvas ref={histCanvasRef} className="levels__histogram" width={340} height={168} />
            <div className="levels__hist-labels">
              <span>0</span>
              <span>64</span>
              <span>128</span>
              <span>192</span>
              <span>255</span>
            </div>
          </div>
        </div>

        {/* Input levels */}
        <div className="levels__section">
          <label>{t('levels.inputLevels')}</label>
          <div className="levels__sliders">
            {/* Black */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot" style={{ background: '#333', border: '1px solid #aaa' }} />
              <label className="levels__slider-label">{t('levels.black')}</label>
              <input
                type="range" min="0" max="254"
                value={currentLevels.black}
                onChange={(e) => handleLevelChange('black', Math.min(parseInt(e.target.value), currentLevels.white - 1))}
                className="levels__slider levels__slider--dark"
              />
              <input
                type="number" min="0" max="254"
                value={currentLevels.black}
                onChange={(e) => handleLevelChange('black', Math.min(parseInt(e.target.value) || 0, currentLevels.white - 1))}
                className="levels__number-input"
              />
            </div>

            {/* Gamma */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot" style={{ background: '#888' }} />
              <label className="levels__slider-label">{t('levels.gamma')}</label>
              <input
                type="range" min="0.1" max="9.9" step="0.05"
                value={currentLevels.gamma}
                onChange={(e) => handleGammaChange(e.target.value)}
                className="levels__slider levels__slider--gamma"
              />
              <input
                type="number" min="0.1" max="9.9" step="0.1"
                value={currentLevels.gamma.toFixed(2)}
                onChange={(e) => handleGammaChange(e.target.value)}
                className="levels__number-input"
              />
            </div>

            {/* White */}
            <div className="levels__slider-group">
              <span className="levels__slider-dot" style={{ background: '#eee' }} />
              <label className="levels__slider-label">{t('levels.white')}</label>
              <input
                type="range" min="1" max="255"
                value={currentLevels.white}
                onChange={(e) => handleLevelChange('white', Math.max(parseInt(e.target.value), currentLevels.black + 1))}
                className="levels__slider levels__slider--light"
              />
              <input
                type="number" min="1" max="255"
                value={currentLevels.white}
                onChange={(e) => handleLevelChange('white', Math.max(parseInt(e.target.value) || 255, currentLevels.black + 1))}
                className="levels__number-input"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="levels__section">
          <label className="levels__checkbox">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => {
                setShowPreview(e.target.checked);
                if (!e.target.checked && originalImageData && canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d');
                  ctx.putImageData(
                    new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height),
                    0, 0
                  );
                }
              }}
            />
            {t('levels.preview')}
          </label>
        </div>

        {/* Buttons */}
        <div className="dialog__buttons">
          <button className="btn btn--ghost" onClick={handleReset}>{t('levels.reset')}</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={handleCancel}>{t('levels.cancel')}</button>
          <button className="btn btn--primary" onClick={handleApply}>{t('levels.apply')}</button>
        </div>
      </div>
    </dialog>
  );
}