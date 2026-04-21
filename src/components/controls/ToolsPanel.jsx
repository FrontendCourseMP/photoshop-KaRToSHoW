import { IconZoomTool, IconHand } from '../ui/Icons';

export default function ToolsPanel({ t, activeTool, setActiveTool }) {
  return (
    <aside className="tools">
      <button className={`tool${activeTool === 'zoom' ? ' tool--active' : ''}`}
        title={`${t('toolbar.zoomToolTitle')} (Z)`}
        aria-label={t('toolbar.zoomToolTitle')}
        onClick={() => setActiveTool('zoom')}>
        <IconZoomTool />
      </button>
      <button className={`tool${activeTool === 'hand' ? ' tool--active' : ''}`}
        title={`${t('toolbar.handPanTitle')} (H)`}
        aria-label={t('toolbar.handPanTitle')}
        onClick={() => setActiveTool('hand')}>
        <IconHand />
      </button>
    <button
      className={`tool${activeTool === 'eyedropper' ? ' tool--active' : ''}`}
      title={`${t('toolbar.eyedropperTitle') || 'Eyedropper'} (I)`}
      aria-label={t('toolbar.eyedropperTitle') || 'Eyedropper'}
      onClick={() => setActiveTool('eyedropper')}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.3 1.3a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-1.6 1.6-2.4-2.4 1.6-1.6z"/>
        <path d="M9.3 3.7 3 10v2h2l6.3-6.3-2-2z"/>
        <path d="M2.5 13.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5S4.8 15 4 15s-1.5-.7-1.5-1.5z"/>
      </svg>
    </button>
      <div className="tools__sep" />
      {[0, 1, 2, 3].map(i => (
        <button key={i} className="tool tool--placeholder" disabled title={t('toolPlaceholder')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3.5" y="3.5" width="9" height="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          </svg>
        </button>
      ))}
    </aside>
  );
}
