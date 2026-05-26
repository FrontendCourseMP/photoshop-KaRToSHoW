import { zoomToSlider, sliderToZoom } from '../../utils/zoom';

export default function StatusBar({ t, imageInfo, zoom, zoomRaw, onZoomChange }) {
  const sliderVal = zoomRaw != null ? zoomToSlider(zoomRaw) : 0.5;

  return (
    <footer className="statusbar">
      <span className="sb-file">{imageInfo?.filename ?? t('status.noFile')}</span>
      {imageInfo && <>
        <span className="sb-sep" />
        <span className="sb-item">{imageInfo.depth}</span>
        <span className="sb-sep" />
        <span className="sb-item sb-format">{imageInfo.format}</span>
      </>}
      <span className="sb-spacer" />
      {imageInfo && onZoomChange && (
        <input
          type="range"
          className="sb-zoom-slider"
          min={0}
          max={1}
          step={0.001}
          value={sliderVal}
          onChange={e => onZoomChange(sliderToZoom(parseFloat(e.target.value)))}
          title={zoom}
        />
      )}
      <span className="sb-zoom">{zoom}</span>
    </footer>
  );
}
