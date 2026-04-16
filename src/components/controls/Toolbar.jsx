import { IconZoomTool, IconHand } from '../ui/Icons';

export default function Toolbar({ t, imageInfo, activeTool, zoomMode, onSetZoomMode, fitToScreen, fillToScreen, zoomTo100 }) {
  return (
    <div className="toolbar">
      {activeTool === 'zoom' && (
        <div className="tbar-group tbar-group--zoom-toolbar">
          <span className="tbar-icon" aria-hidden="true"><IconZoomTool /></span>
          <button
            className={`tbtn${zoomMode === 'out' ? ' tbtn--active' : ''}`}
            title={t('toolbar.zoomOutTitle')}
            onClick={() => onSetZoomMode('out')}
            disabled={!imageInfo}
          >
            - {t('toolbar.zoomOutTitle')}
          </button>
          <button
            className={`tbtn${zoomMode === 'in' ? ' tbtn--active' : ''}`}
            title={t('toolbar.zoomInTitle')}
            onClick={() => onSetZoomMode('in')}
            disabled={!imageInfo}
          >
            + {t('toolbar.zoomInTitle')}
          </button>
          <button className="tbtn" title={t('toolbar.fitTitle')} onClick={fitToScreen} disabled={!imageInfo}>{t('toolbar.fit')}</button>
          <button className="tbtn" title={t('toolbar.fillTitle')} onClick={fillToScreen} disabled={!imageInfo}>{t('toolbar.fill')}</button>
        </div>
      )}
      {activeTool === 'hand' && (
        <div className="tbar-group tbar-group--zoom-toolbar">
          <span className="tbar-icon" aria-hidden="true"><IconHand /></span>
          <button className="tbtn" title={t('toolbar.actualTitle')} onClick={zoomTo100} disabled={!imageInfo}>100%</button>
          <button className="tbtn" title={t('toolbar.fitTitle')} onClick={fitToScreen} disabled={!imageInfo}>{t('toolbar.fit')}</button>
          <button className="tbtn" title={t('toolbar.fillTitle')} onClick={fillToScreen} disabled={!imageInfo}>{t('toolbar.fill')}</button>
        </div>
      )}
    </div>
  );
}
