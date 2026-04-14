import { IconZoomTool, IconHand } from './Icons';

export default function ToolsPanel({ t, activeTool, setActiveTool }) {
  return (
    <aside className="tools">
      <button className={`tool${activeTool === 'zoom' ? ' tool--active' : ''}`}
        title={t('toolbar.zoomToolTitle')} onClick={() => setActiveTool('zoom')}>
        <IconZoomTool />
      </button>
      <button className={`tool${activeTool === 'hand' ? ' tool--active' : ''}`}
        title={t('toolbar.handPanTitle')} onClick={() => setActiveTool('hand')}>
        <IconHand />
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
