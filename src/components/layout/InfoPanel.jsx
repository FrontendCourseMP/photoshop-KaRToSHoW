export default function InfoPanel({ t, imageInfo, zoom, activeToolLabel, eyedropper }) {
  // Вычисляем HEX из RGB
  const toHex = (r, g, b) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  const hasColor = eyedropper && eyedropper.r != null;

  // Копирование HEX в буфер обмена
  const copyHex = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex);
      // Можно добавить уведомление, но пока просто копируем
    } catch (err) {
      console.warn('Failed to copy HEX', err);
    }
  };

  return (
    <aside className="info-panel">
      <section className="info-section">
        <h3 className="info-section__title">{t('info.image')}</h3>
        {imageInfo ? (
          <dl className="info-list">
            <dt>{t('info.width')}</dt>
            <dd>{imageInfo.width} <span style={{ color: 'var(--c-text-3)', fontSize: 10 }}>px</span></dd>
            <dt>{t('info.height')}</dt>
            <dd>{imageInfo.height} <span style={{ color: 'var(--c-text-3)', fontSize: 10 }}>px</span></dd>
            <dt>{t('info.format')}</dt>
            <dd><span className="info-format-badge">{imageInfo.format}</span></dd>
            <dt>{t('info.depth')}</dt>
            <dd style={{ fontSize: 10 }}>{imageInfo.depth}</dd>
            <dt>{t('info.pixels')}</dt>
            <dd>{(imageInfo.width * imageInfo.height).toLocaleString()}</dd>
          </dl>
        ) : <p className="info-empty">{t('status.noFile')}</p>}
      </section>

      <section className="info-section">
        <h3 className="info-section__title">{t('info.view')}</h3>
        <dl className="info-list">
          <dt>{t('info.zoom')}</dt>
          <dd className="info-accent" style={{ fontSize: 12, fontWeight: 600 }}>{zoom}</dd>
          <dt>{t('info.tool')}</dt>
          <dd style={{ fontSize: 10 }}>{activeToolLabel}</dd>
        </dl>
      </section>

      {/* ── Eyedropper section ── */}
      <section className="info-section info-section--eyedropper">
        <h3 className="info-section__title">
          {hasColor && <span className="eyedropper-dot" />}
          {t('info.eyedropper') || 'Eyedropper'}
        </h3>

        {hasColor ? (() => {
          const { r, g, b, x, y, lab } = eyedropper;
          const hex = toHex(r, g, b);
          return (
            <>
              {/* Цветовой свотч */}
              <div className="eyedropper-swatch">
                <div
                  className="eyedropper-swatch__fill"
                  style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                />
                <div className="eyedropper-swatch__overlay" />
                <div className="eyedropper-swatch__meta">
                  <span 
                    className="eyedropper-swatch__hex"
                    onClick={() => copyHex(hex)}
                    title={t('info.copyHex') || 'Copy HEX'}
                  >
                    {hex}
                  </span>
                  <span className="eyedropper-swatch__coords">{x}, {y}</span>
                </div>
              </div>

              {/* RGB полоски */}
              <div className="eyedropper-channels">
                {[
                  { key: 'r', label: 'R', val: r },
                  { key: 'g', label: 'G', val: g },
                  { key: 'b', label: 'B', val: b },
                ].map(({ key, label, val }) => (
                  <div key={key} className={`eyedropper-ch eyedropper-ch--${key}`}>
                    <span className="eyedropper-ch__label">{label}</span>
                    <div className="eyedropper-ch__track">
                      <div
                        className="eyedropper-ch__fill"
                        style={{ width: `${(val / 255) * 100}%` }}
                      />
                    </div>
                    <span className="eyedropper-ch__val">{val}</span>
                  </div>
                ))}
              </div>

              {/* CIELAB bars — L: 0–100, a/b: –128…+127 */}
              {lab && (
                <>
                  <div className="eyedropper-section-label">CIE L*a*b*</div>
                  <div className="eyedropper-channels eyedropper-channels--lab">
                    {[
                      { key: 'L', cls: 'lab-L', val: lab.L, pct: (lab.L / 100) * 100 },
                      { key: 'a', cls: 'lab-a', val: lab.a, pct: ((lab.a + 128) / 255) * 100 },
                      { key: 'b', cls: 'lab-b', val: lab.b, pct: ((lab.b + 128) / 255) * 100 },
                    ].map(({ key, cls, val, pct }) => (
                      <div key={key} className={`eyedropper-ch eyedropper-ch--${cls}`}>
                        <span className="eyedropper-ch__label">{key}</span>
                        <div className="eyedropper-ch__track">
                          <div
                            className="eyedropper-ch__fill"
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          />
                        </div>
                        <span className="eyedropper-ch__val">
                          {val != null ? (val >= 0 && key !== 'L' ? '+' : '') + val.toFixed(0) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })() : (
          <p className="info-empty">
            {t('info.eyedropperEmpty') || 'Select Eyedropper and click on image'}
          </p>
        )}
      </section>
    </aside>
  );
}