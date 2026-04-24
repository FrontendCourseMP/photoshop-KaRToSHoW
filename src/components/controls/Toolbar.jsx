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
      {activeTool === 'eyedropper' && (
        <div className="tbar-group tbar-group--eyedropper">
          <span className="tbar-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.3 1.3a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-1.6 1.6-2.4-2.4 1.6-1.6z"/>
              <path d="M9.3 3.7 3 10v2h2l6.3-6.3-2-2z"/>
              <path d="M2.5 13.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5S4.8 15 4 15s-1.5-.7-1.5-1.5z"/>
            </svg>
          </span>
          <button
            className="tbtn"
            title={t('toolbar.eyedropperSample')}
            disabled={!imageInfo}
          >
            {t('toolbar.eyedropperSample')}
          </button>
        </div>
      )}
    </div>
  );
}
