import { useEffect, useRef } from 'react';

function makeThumbFromImageData(orig, width, height, thumbW, thumbH, channel) {
  const out = new Uint8ClampedArray(thumbW * thumbH * 4);
  for (let y = 0; y < thumbH; y++) {
    for (let x = 0; x < thumbW; x++) {
      const sx = Math.floor(x * width / thumbW);
      const sy = Math.floor(y * height / thumbH);
      const si = (sy * width + sx) * 4;
      const r = orig[si], g = orig[si + 1], b = orig[si + 2], a = orig[si + 3];
      let rr = 0, gg = 0, bb = 0, aa = 255;
      if (channel === 'R') { rr = r; }
      else if (channel === 'G') { gg = g; }
      else if (channel === 'B') { bb = b; }
      else if (channel === 'A') { rr = gg = bb = a; }
      else if (channel === 'Gray') { rr = gg = bb = r; }
      const di = (y * thumbW + x) * 4;
      out[di] = rr; out[di + 1] = gg; out[di + 2] = bb; out[di + 3] = aa;
    }
  }
  return new ImageData(out, thumbW, thumbH);
}

export default function ChannelsPanel({ imageInfo, originalImageData, channels, setChannels }) {
  const rRef   = useRef(null);
  const gRef   = useRef(null);
  const bRef   = useRef(null);
  const aRef   = useRef(null);
  const grayRef = useRef(null);

  useEffect(() => {
    if (!imageInfo || !originalImageData) return;
    const { width, height } = imageInfo;
    const thumbW = 40;
    const thumbH = 40;
    const orig = originalImageData.data;
    const isGray  = imageInfo.depth?.toLowerCase().includes('gray');
    const hasAlpha = imageInfo.depth?.toLowerCase().includes('alpha') || imageInfo.depth?.toLowerCase().includes('rgba');

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
        <h3 className="info-section__title">Channels</h3>
        <p className="info-empty">No image loaded</p>
      </div>
    </aside>
  );

  const isGray   = imageInfo.depth?.toLowerCase().includes('gray');
  const hasAlpha = imageInfo.depth?.toLowerCase().includes('alpha') || imageInfo.depth?.toLowerCase().includes('rgba');
  const items    = isGray ? ['Gray'] : ['R', 'G', 'B'];
  if (hasAlpha) items.push('A');

  const refMap  = { R: rRef, G: gRef, B: bRef, A: aRef, Gray: grayRef };
  const labelMap = { R: 'Red', G: 'Green', B: 'Blue', A: 'Alpha', Gray: 'Grayscale' };

  return (
    <aside className="channels-panel">
      <div className="info-section">
        <h3 className="info-section__title">Channels</h3>
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
                <div className="channel-badge">active</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}