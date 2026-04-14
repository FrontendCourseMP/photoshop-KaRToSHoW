export default function StatusBar({ t, imageInfo, zoom }) {
  return (
    <footer className="statusbar">
      <span className="sb-file">{imageInfo?.filename ?? t('status.noFile')}</span>
      {imageInfo && <>
        <span className="sb-sep" />
        <span className="sb-item">{imageInfo.width} × {imageInfo.height} px</span>
        <span className="sb-sep" />
        <span className="sb-item">{imageInfo.depth}</span>
        <span className="sb-sep" />
        <span className="sb-item sb-format">{imageInfo.format}</span>
      </>}
      <span className="sb-spacer" />
      <span className="sb-zoom">{zoom}</span>
    </footer>
  );
}
