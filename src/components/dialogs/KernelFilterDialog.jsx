import { useState, useRef, useEffect, useCallback } from 'react';
import Dialog from '../ui/Dialog';
import { KERNEL_PRESETS, computeDivisor } from '../../utils/kernelFilter';

const IDENTITY = [0, 0, 0, 0, 1, 0, 0, 0, 0];

const DEFAULT_STATE = {
  kernelVals: [...IDENTITY],
  selectedPreset: 'identity',
  channelR: true,
  channelG: true,
  channelB: true,
  edgeHandling: 'copy',
};

export default function KernelFilterDialog({
  t,
  imageInfo,
  originalImageData,
  canvasRef,
  onClose,
  onApply,
  setGlobalLoading,
}) {
  const [kernelVals,     setKernelVals]     = useState([...IDENTITY]);
  const [selectedPreset, setSelectedPreset] = useState('identity');
  const [channelR,       setChannelR]       = useState(true);
  const [channelG,       setChannelG]       = useState(true);
  const [channelB,       setChannelB]       = useState(true);
  const [edgeHandling,   setEdgeHandling]   = useState('copy');
  const [showPreview,    setShowPreview]    = useState(true);
  const [processing,     setProcessing]     = useState(false);

  // Tracks whether the apply worker is running (blocks buttons during final apply)
  const applyWorkerRef = useRef(null);

  const depth  = imageInfo?.depth?.toLowerCase() ?? '';
  const isGray = depth.includes('gray');

  const getChannels = useCallback(() => {
    if (isGray) return ['R', 'G', 'B'];
    const ch = [];
    if (channelR) ch.push('R');
    if (channelG) ch.push('G');
    if (channelB) ch.push('B');
    return ch.length > 0 ? ch : ['R', 'G', 'B'];
  }, [isGray, channelR, channelG, channelB]);

  // ── Restore original on canvas ───────────────────────────────────────────
  const restoreOriginal = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    canvasRef.current.getContext('2d').putImageData(
      new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height,
      ),
      0, 0,
    );
  }, [originalImageData, canvasRef]);

  // ── Live preview effect — spawns worker, cleans up on deps change ────────
  useEffect(() => {
    if (!showPreview || !originalImageData) return;

    let active = true;
    setProcessing(true);

    const worker = new Worker(
      new URL('../../workers/kernelFilter.worker.js', import.meta.url),
      { type: 'module' },
    );

    const channels  = getChannels();
    const divisor   = computeDivisor(kernelVals);
    const dataCopy  = new Uint8ClampedArray(originalImageData.data);

    worker.onmessage = (e) => {
      if (!active) return;
      worker.terminate();
      setProcessing(false);
      if (canvasRef.current) {
        canvasRef.current.getContext('2d').putImageData(
          new ImageData(e.data.result, originalImageData.width, originalImageData.height),
          0, 0,
        );
      }
    };

    worker.onerror = () => { if (active) setProcessing(false); };

    worker.postMessage(
      { data: dataCopy, width: originalImageData.width, height: originalImageData.height,
        kernelVals, divisor, channels, edgeHandling },
      [dataCopy.buffer],
    );

    return () => {
      active = false;
      worker.terminate();
      setProcessing(false);
    };
  // kernelVals changes on every keystroke — intentionally included so preview updates live
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, kernelVals, channelR, channelG, channelB, edgeHandling, originalImageData]);

  // Cleanup apply worker on unmount
  useEffect(() => () => { applyWorkerRef.current?.terminate(); }, []);

  // ── Preset select ────────────────────────────────────────────────────────
  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    const preset = KERNEL_PRESETS.find(p => p.id === presetId);
    if (preset) setKernelVals([...preset.kernel]);
  };

  // ── Kernel cell edit ─────────────────────────────────────────────────────
  const handleCellChange = (index, raw) => {
    setSelectedPreset('custom');
    setKernelVals(prev => {
      const next = [...prev];
      next[index] = raw === '' || raw === '-' ? 0 : (parseFloat(raw) || 0);
      return next;
    });
  };

  // ── Toggle preview ───────────────────────────────────────────────────────
  const handleTogglePreview = (checked) => {
    setShowPreview(checked);
    if (!checked) restoreOriginal();
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setKernelVals([...IDENTITY]);
    setSelectedPreset('identity');
    setChannelR(DEFAULT_STATE.channelR);
    setChannelG(DEFAULT_STATE.channelG);
    setChannelB(DEFAULT_STATE.channelB);
    setEdgeHandling(DEFAULT_STATE.edgeHandling);
  };

  // ── Cancel ───────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    restoreOriginal();
    onClose();
  }, [restoreOriginal, onClose]);

  // ── Apply ────────────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!originalImageData) return onClose();

    // Prevent double-click
    if (applyWorkerRef.current) return;

    setProcessing(true);
    setGlobalLoading?.(true);

    const worker = new Worker(
      new URL('../../workers/kernelFilter.worker.js', import.meta.url),
      { type: 'module' },
    );
    applyWorkerRef.current = worker;

    const channels = getChannels();
    const divisor  = computeDivisor(kernelVals);
    const dataCopy = new Uint8ClampedArray(originalImageData.data);

    worker.onmessage = async (e) => {
      applyWorkerRef.current = null;
      setProcessing(false);
      const newImageData = new ImageData(e.data.result, originalImageData.width, originalImageData.height);
      if (canvasRef.current) {
        canvasRef.current.getContext('2d').putImageData(newImageData, 0, 0);
      }
      try {
        const p = onApply?.(newImageData);
        if (p && typeof p.then === 'function') await p;
      } finally {
        setGlobalLoading?.(false);
        onClose();
      }
    };

    worker.onerror = () => {
      applyWorkerRef.current = null;
      setProcessing(false);
      setGlobalLoading?.(false);
    };

    worker.postMessage(
      { data: dataCopy, width: originalImageData.width, height: originalImageData.height,
        kernelVals, divisor, channels, edgeHandling },
      [dataCopy.buffer],
    );
  };

  // ── No image ─────────────────────────────────────────────────────────────
  if (!originalImageData) {
    return (
      <Dialog title={t('kernel.title')} onClose={onClose}>
        <p style={{ color: 'var(--c-text-2)', fontSize: 12, marginBottom: 16 }}>{t('status.noFile')}</p>
        <div className="dialog__buttons">
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>{t('menu.close')}</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={t('kernel.title')} onClose={handleCancel}>

      {/* ── Preset ── */}
      <div className="kernel__section">
        <label className="kernel__label">{t('kernel.preset')}</label>
        <select
          className="kernel__select"
          value={selectedPreset}
          onChange={e => handlePresetChange(e.target.value)}
        >
          {KERNEL_PRESETS.map(p => (
            <option key={p.id} value={p.id}>{t(`kernel.presets.${p.id}`)}</option>
          ))}
          {selectedPreset === 'custom' && (
            <option value="custom">{t('kernel.custom')}</option>
          )}
        </select>
      </div>

      {/* ── 3×3 kernel grid ── */}
      <div className="kernel__section">
        <label className="kernel__label">{t('kernel.matrix')}</label>
        <div className="kernel__grid">
          {kernelVals.map((v, i) => (
            <input
              key={i}
              type="number"
              step="1"
              className="kernel__cell"
              value={v}
              onChange={e => handleCellChange(i, e.target.value)}
            />
          ))}
        </div>
      </div>

      {/* ── Channel checkboxes (hidden for grayscale) ── */}
      {!isGray && (
        <div className="kernel__section">
          <label className="kernel__label">{t('kernel.channels')}</label>
          <div className="kernel__channels">
            <label className="kernel__checkbox">
              <input type="checkbox" checked={channelR} onChange={e => setChannelR(e.target.checked)} />
              <span style={{ color: '#ff5555' }}>{t('channels.red')}</span>
            </label>
            <label className="kernel__checkbox">
              <input type="checkbox" checked={channelG} onChange={e => setChannelG(e.target.checked)} />
              <span style={{ color: '#44cc44' }}>{t('channels.green')}</span>
            </label>
            <label className="kernel__checkbox">
              <input type="checkbox" checked={channelB} onChange={e => setChannelB(e.target.checked)} />
              <span style={{ color: '#4488ff' }}>{t('channels.blue')}</span>
            </label>
          </div>
        </div>
      )}

      {/* ── Edge handling ── */}
      <div className="kernel__section">
        <label className="kernel__label">{t('kernel.edgeHandling')}</label>
        <div className="kernel__radios">
          {['black', 'white', 'copy'].map(strategy => (
            <label key={strategy} className="kernel__radio">
              <input
                type="radio"
                name="kernelEdge"
                value={strategy}
                checked={edgeHandling === strategy}
                onChange={() => setEdgeHandling(strategy)}
              />
              {t(`kernel.edge.${strategy}`)}
            </label>
          ))}
        </div>
      </div>

      {/* ── Preview + processing indicator ── */}
      <div className="kernel__section--row">
        <label className="levels__checkbox">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={e => handleTogglePreview(e.target.checked)}
          />
          {t('levels.preview')}
        </label>
        {processing && (
          <span className="kernel__processing">{t('kernel.processing')}</span>
        )}
      </div>

      {/* ── Buttons ── */}
      <div className="dialog__buttons">
        <button className="btn btn--ghost" onClick={handleReset} disabled={processing}>
          {t('levels.reset')}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary" onClick={handleCancel} disabled={processing}>
          {t('levels.cancel')}
        </button>
        <button className="btn btn--primary" onClick={handleApply} disabled={processing}>
          {t('levels.apply')}
        </button>
      </div>

    </Dialog>
  );
}
