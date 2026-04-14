import ZoomSelect from './ZoomSelect';
import { IconZoomIn, IconZoomOut } from '../ui/Icons';

export default function Toolbar({ t, imageInfo, zoom, onZoomChange, zoomIn, zoomOut, fitToScreen, zoomTo100 }) {
  return (
    <div className="toolbar">
      <div className="tbar-group tbar-group--zoom">
        <button className="tbtn tbtn--icon" title={t('toolbar.zoomOutTitle')} onClick={zoomOut} disabled={!imageInfo}><IconZoomOut /></button>
        <ZoomSelect zoom={zoom} onChange={onZoomChange} />
        <button className="tbtn tbtn--icon" title={t('toolbar.zoomInTitle')} onClick={zoomIn} disabled={!imageInfo}><IconZoomIn /></button>
        <div className="tbar-sep" />
        <button className="tbtn" title={t('toolbar.fitTitle')} onClick={fitToScreen} disabled={!imageInfo}>{t('toolbar.fit')}</button>
        <button className="tbtn" title={t('toolbar.actualTitle')} onClick={zoomTo100} disabled={!imageInfo}>{t('toolbar.actual')}</button>
      </div>
    </div>
  );
}
