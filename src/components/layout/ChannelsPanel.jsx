import { useEffect, useRef } from 'react';

function makeThumbFromImageData(orig, width, height, thumbW, thumbH, channel) {
  const out = new Uint8ClampedArray(thumbW * thumbH * 4);

  // Вписываем изображение в квадрат thumbW×thumbH с сохранением пропорций
  const scale = Math.min(thumbW / width, thumbH / height);
  const sw    = Math.max(1, Math.round(width  * scale));
  const sh    = Math.max(1, Math.round(height * scale));
  const ox    = Math.floor((thumbW - sw) / 2);
  const oy    = Math.floor((thumbH - sh) / 2);

  for (let y = 0; y < thumbH; y++) {
    for (let x = 0; x < thumbW; x++) {
      const di = (y * thumbW + x) * 4;
      if (x < ox || x >= ox + sw || y < oy || y >= oy + sh) {
        // Letterbox — прозрачно (CSS-фон канвы видна)
        out[di + 3] = 0;
        continue;
      }
      const sx = Math.min(width  - 1, Math.floor((x - ox) * width  / sw));
      const sy = Math.min(height - 1, Math.floor((y - oy) * height / sh));
      const si = (sy * width + sx) * 4;
      const r = orig[si], g = orig[si + 1], b = orig[si + 2], a = orig[si + 3];
      let rr = 0, gg = 0, bb = 0;
      if      (channel === 'R')    rr = r;
      else if (channel === 'G')    gg = g;
      else if (channel === 'B')    bb = b;
      else if (channel === 'A')    rr = gg = bb = a;
      else if (channel === 'Gray') rr = gg = bb = r;
      out[di] = rr; out[di + 1] = gg; out[di + 2] = bb; out[di + 3] = 255;
    }
  }
  return new ImageData(out, thumbW, thumbH);
}

export default function ChannelsPanel({ t, imageInfo, originalImageData, channels, setChannels }) {
  const rRef   = useRef(null);
  const gRef   = useRef(null);
  const bRef   = useRef(null);
  const aRef   = useRef(null);
  const grayRef = useRef(null);

  useEffect(() => {
    if (!imageInfo || !originalImageData) return;
    const width  = originalImageData.width;
    const height = originalImageData.height;
    if (imageInfo.width !== width || imageInfo.height !== height) return;
    const thumbW = 40;
    const thumbH = 40;
    const orig = originalImageData.data;
    const d        = imageInfo.depth?.toLowerCase() ?? '';
    const isGray   = d.includes('gray');
    const hasAlpha = d.includes('alpha') || d.includes('rgba') || d.includes('mask');

    const channelsList = isGray ? ['Gray'] : ['R', 'G', 'B'];
    if (hasAlpha) channelsList.push('A');

    const refs = { R: rRef, G: gRef, B: bRef, A: aRef, Gray: grayRef };
    channelsList.forEach((ch) => {
      const ref = refs[ch];
      if (!ref?.current) return;
      const canvas = ref.current;
      canvas.width  = thumbW;
      canvas.height = thumbH;
      const ctx  = canvas.getContext('2d');
      const imgd = makeThumbFromImageData(orig, width, height, thumbW, thumbH, ch);
      ctx.putImageData(imgd, 0, 0);
    });
  }, [imageInfo, originalImageData]);

  if (!imageInfo || !originalImageData) return (
    <aside className="channels-panel">
      <div className="info-section">
        <h3 className="info-section__title">{t ? t('channels.title') : 'Channels'}</h3>
        <p className="info-empty">{t ? t('channels.noImage') : 'No image loaded'}</p>
      </div>
    </aside>
  );

  const d        = imageInfo.depth?.toLowerCase() ?? '';
  const isGray   = d.includes('gray');
  const isMask   = d.includes('mask');
  const hasAlpha = d.includes('alpha') || d.includes('rgba') || isMask;
  const items    = isGray ? ['Gray'] : ['R', 'G', 'B'];
  if (hasAlpha) items.push('A');

  const refMap  = { R: rRef, G: gRef, B: bRef, A: aRef, Gray: grayRef };
  const labelMap = {
    R:    t ? t('channels.red')       : 'Red',
    G:    t ? t('channels.green')     : 'Green',
    B:    t ? t('channels.blue')      : 'Blue',
    A:    isMask ? (t ? t('channels.mask') : 'Mask') : (t ? t('channels.alpha') : 'Alpha'),
    Gray: t ? t('channels.grayscale') : 'Grayscale',
  };

  return (
    <aside className="channels-panel">
      <div className="info-section">
        <h3 className="info-section__title">{t ? t('channels.title') : 'Channels'}</h3>
        <div className="channels-list">
          {items.map((ch) => (
            <label
              key={ch}
              data-ch={ch}
              className={`channel-item ${channels[ch] ? 'channel-item--active' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!channels[ch]}
                onChange={(e) => setChannels(prev => ({ ...prev, [ch]: e.target.checked }))}
                className="channel-checkbox"
              />
              <canvas ref={refMap[ch]} className="channel-thumb" />
              <div className="channel-meta">
                <div className="channel-name">{labelMap[ch]}</div>
                <div className="channel-badge">{t ? t('channels.active') : 'active'}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}