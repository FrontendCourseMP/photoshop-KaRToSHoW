import { useState, useMemo } from 'react';
import { INTERPOLATION_METHODS, resizeImage } from '../../utils/interpolation';
import Dialog from '../ui/Dialog';

const MIN_PX  = 1;
const MAX_PX  = 32000;
const MIN_PCT = 1;
const MAX_PCT = 3000;

function clampStr(val, min, max) {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export default function ResizeDialog({ t, imageInfo, originalImageData, onClose, onApply }) {
  const origW = imageInfo?.width  ?? 1;
  const origH = imageInfo?.height ?? 1;
  const origPixels = origW * origH;

  const [unit,     setUnit]     = useState('percent');
  const [wVal,     setWVal]     = useState('100');
  const [hVal,     setHVal]     = useState('100');
  const [lock,     setLock]     = useState(true);
  const [methodId, setMethodId] = useState('bilinear');
  const [errors,   setErrors]   = useState({ w: '', h: '' });

  // ── Computed ──────────────────────────────────────────────────────────────
  const clearErr = (field) => setErrors(prev => ({ ...prev, [field]: '' }));

  const { newW, newH } = useMemo(() => {
    const w = parseFloat(wVal);
    const h = parseFloat(hVal);
    if (unit === 'percent') {
      return {
        newW: Math.max(1, Math.round(origW * (isNaN(w) ? 1 : w) / 100)),
        newH: Math.max(1, Math.round(origH * (isNaN(h) ? 1 : h) / 100)),
      };
    }
    return {
      newW: Math.max(1, isNaN(w) ? 1 : Math.round(w)),
      newH: Math.max(1, isNaN(h) ? 1 : Math.round(h)),
    };
  }, [wVal, hVal, unit, origW, origH]);

  const newPixels = newW * newH;

  // Шкала масштаба: 1% → 0 fill, 100% → ~33 fill, 300% → 100 fill (log-ish)
  const scalePct = unit === 'percent'
    ? (parseFloat(wVal) || 100)
    : ((parseFloat(wVal) || origW) / origW) * 100;
  const barFill = Math.round(Math.min(100, Math.max(0, (Math.min(scalePct, 300) - 1) / 299 * 100)));
  const isUp   = newPixels > origPixels;
  const isDown = newPixels < origPixels;

  const currentMethod = INTERPOLATION_METHODS.find(m => m.id === methodId) ?? INTERPOLATION_METHODS[0];

  // ── W/H handlers ──────────────────────────────────────────────────────────
  const handleW = (val) => {
    setWVal(val);
    clearErr('w');
    if (!lock) return;
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0)
      setHVal(unit === 'percent' ? val : String(Math.max(1, Math.round(n * origH / origW))));
  };

  const handleH = (val) => {
    setHVal(val);
    clearErr('h');
    if (!lock) return;
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0)
      setWVal(unit === 'percent' ? val : String(Math.max(1, Math.round(n * origW / origH))));
  };

  const handleUnit = (u) => {
    if (u === unit) return;
    const w = parseFloat(wVal);
    const h = parseFloat(hVal);
    if (u === 'percent') {
      setWVal(isNaN(w) ? '100' : String(Math.round((w / origW) * 100)));
      setHVal(isNaN(h) ? '100' : String(Math.round((h / origH) * 100)));
    } else {
      setWVal(isNaN(w) ? String(origW) : String(Math.max(1, Math.round(origW * w / 100))));
      setHVal(isNaN(h) ? String(origH) : String(Math.max(1, Math.round(origH * h / 100))));
    }
    setUnit(u);
    setErrors({ w: '', h: '' });
  };

  // ── Validate & apply ──────────────────────────────────────────────────────
  const validate = () => {
    const [min, max] = unit === 'percent' ? [MIN_PCT, MAX_PCT] : [MIN_PX, MAX_PX];
    const label = unit === 'percent' ? '%' : 'px';
    const wN = clampStr(wVal, min, max);
    const hN = clampStr(hVal, min, max);
    const errs = { w: '', h: '' };
    if (wN === null) errs.w = `${min}–${max} ${label}`;
    if (hN === null) errs.h = `${min}–${max} ${label}`;
    setErrors(errs);
    return !errs.w && !errs.h;
  };

  const handleApply = () => {
    if (!validate() || !originalImageData) return;
    const result = resizeImage(originalImageData, newW, newH, methodId);
    onApply(result, newW, newH);
    onClose();
  };

  const fmtMP = (px) =>
    px >= 1_000_000
      ? `${(px / 1_000_000).toFixed(2)} ${t('resize.mp')}`
      : `${(px / 1000).toFixed(1)} ${t('resize.kp')}`;

  return (
    <Dialog title={t('resize.title')} onClose={onClose} className="resize__content">

        {/* ── Статистика пикселей ── */}
        <div className="resize__stats">
          <div className="resize__stat">
            <span className="resize__stat-label">{t('resize.pixelsBefore')}</span>
            <span className="resize__stat-value">{fmtMP(origPixels)}</span>
            <span className="resize__stat-dim">{origW} × {origH}</span>
          </div>

          <div className="resize__scale-visual">
            <div className="resize__scale-bar">
              <div
                className="resize__scale-bar-fill"
                style={{
                  width: `${barFill}%`,
                  background: isUp ? 'var(--c-accent)' : 'var(--c-text-3)',
                }}
              />
            </div>
            <span
              className="resize__scale-arrow"
              style={{ color: isUp ? 'var(--c-accent)' : isDown ? 'var(--c-text-2)' : 'var(--c-text-3)' }}
            >
              {isUp ? '↑' : isDown ? '↓' : '↔'}
            </span>
          </div>

          <div className="resize__stat resize__stat--right">
            <span className="resize__stat-label">{t('resize.pixelsAfter')}</span>
            <span
              className="resize__stat-value"
              style={{ color: newPixels !== origPixels ? 'var(--c-accent)' : 'var(--c-text)' }}
            >
              {fmtMP(newPixels)}
            </span>
            <span className="resize__stat-dim">{newW} × {newH}</span>
          </div>
        </div>

        {/* ── Единицы ── */}
        <div className="levels__section">
          <label>{t('resize.unit')}</label>
          <div className="resize__unit-tabs">
            {[['percent', '%'], ['px', t('resize.unitPx')]].map(([u, label]) => (
              <button
                key={u}
                className={`resize__unit-btn${unit === u ? ' resize__unit-btn--active' : ''}`}
                onClick={() => handleUnit(u)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Ширина / Высота ── */}
        <div className="levels__section">
          <div className="resize__wh">
            <div className="resize__field">
              <label className="resize__field-label">
                {t('resize.width')}
                <span className="resize__unit-tag">{unit === 'percent' ? '%' : 'px'}</span>
              </label>
              <input
                type="number"
                className={`resize__num-input${errors.w ? ' resize__num-input--err' : ''}`}
                min={unit === 'percent' ? MIN_PCT : MIN_PX}
                max={unit === 'percent' ? MAX_PCT : MAX_PX}
                value={wVal}
                onChange={e => handleW(e.target.value)}
              />
              {errors.w && <span className="resize__err-msg">{errors.w}</span>}
            </div>

            <button
              className={`resize__lock-btn${lock ? ' resize__lock-btn--on' : ''}`}
              onClick={() => setLock(v => !v)}
              title={t('resize.lockAspect')}
              aria-label={t('resize.lockAspect')}
            >
              {lock ? '⛓' : '⛓︎'}
            </button>

            <div className="resize__field">
              <label className="resize__field-label">
                {t('resize.height')}
                <span className="resize__unit-tag">{unit === 'percent' ? '%' : 'px'}</span>
              </label>
              <input
                type="number"
                className={`resize__num-input${errors.h ? ' resize__num-input--err' : ''}`}
                min={unit === 'percent' ? MIN_PCT : MIN_PX}
                max={unit === 'percent' ? MAX_PCT : MAX_PX}
                value={hVal}
                onChange={e => handleH(e.target.value)}
              />
              {errors.h && <span className="resize__err-msg">{errors.h}</span>}
            </div>
          </div>

          {unit === 'percent' && (
            <p className="resize__px-preview">{newW} × {newH} px</p>
          )}
        </div>

        {/* ── Интерполяция — пилюли, как у гистограммы ── */}
        <div className="levels__section">
          <label>{t('resize.method')}</label>
          <div className="levels__scale-tabs resize__method-tabs">
            {INTERPOLATION_METHODS.map(m => (
              <button
                key={m.id}
                className={`levels__scale-btn${methodId === m.id ? ' levels__scale-btn--active' : ''}`}
                onClick={() => setMethodId(m.id)}
              >
                {t(m.nameKey)}
              </button>
            ))}
          </div>
          <p className="resize__tooltip-text">{t(currentMethod.tooltipKey)}</p>
        </div>

        {/* ── Кнопки ── */}
        <div className="dialog__buttons">
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>{t('levels.cancel')}</button>
          <button className="btn btn--primary"   onClick={handleApply}>{t('levels.apply')}</button>
        </div>

    </Dialog>
  );
}
