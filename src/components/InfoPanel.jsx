export default function InfoPanel({ t, imageInfo, zoom, activeToolLabel }) {
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
    </aside>
  );
}
