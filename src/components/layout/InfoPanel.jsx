export default function InfoPanel({ t, imageInfo, zoom, activeToolLabel, eyedropper }) {
  // Вычисляем HEX из RGB
  const toHex = (r, g, b) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  const hasColor = eyedropper && eyedropper.r != null;

  return (
    <aside className="info-panel">
      <section className="info-section">
        <h3 className="info-section__title">{t('info.image')}</h3>
        {imageInfo ? (
          <dl className="info-list">
            <dt>{t('info.width')}</dt>  <dd>{imageInfo.width} px</dd>
            <dt>{t('info.height')}</dt> <dd>{imageInfo.height} px</dd>
            <dt>{t('info.depth')}</dt>  <dd>{imageInfo.depth}</dd>
            <dt>{t('info.format')}</dt> <dd className="info-accent">{imageInfo.format}</dd>
            <dt>{t('info.pixels')}</dt> <dd>{(imageInfo.width * imageInfo.height).toLocaleString()}</dd>
          </dl>
        ) : <p className="info-empty">{t('status.noFile')}</p>}
      </section>

      <section className="info-section">
        <h3 className="info-section__title">{t('info.view')}</h3>
        <dl className="info-list">
          <dt>{t('info.zoom')}</dt>  <dd className="info-accent">{zoom}</dd>
          <dt>{t('info.tool')}</dt>  <dd>{activeToolLabel}</dd>
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
                  <span className="eyedropper-swatch__hex">{hex}</span>
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

              {/* CIELAB */}
              {lab && (
                <div className="eyedropper-lab">
                  {[
                    { key: 'L', val: lab.L },
                    { key: 'a', val: lab.a },
                    { key: 'b', val: lab.b },
                  ].map(({ key, val }) => (
                    <div key={key} className="eyedropper-lab__cell">
                      <span className="eyedropper-lab__key">{key}</span>
                      <span className="eyedropper-lab__val">{val?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
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