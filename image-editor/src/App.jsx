import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';

const ZOOM_PRESETS = [
  { label: '10%',  v: 0.10 },
  { label: '25%',  v: 0.25 },
  { label: '50%',  v: 0.50 },
  { label: '75%',  v: 0.75 },
  { label: '100%', v: 1.00 },
  { label: '150%', v: 1.50 },
  { label: '200%', v: 2.00 },
  { label: '400%', v: 4.00 },
  { label: '800%', v: 8.00 },
];

const fmtZoom = (z) => `${Math.round(z * 100)}%`;

// Выпадающее меню
function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className={`menu__trigger${open ? ' menu__trigger--open' : ''}`} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <ul className="menu__dropdown" onMouseLeave={() => setOpen(false)}>
          {items.map((item, i) =>
            item === '---'
              ? <li key={i} className="menu__sep" />
              : <li key={i}>
                  <button className="menu__item" disabled={item.disabled}
                    onClick={() => { item.action?.(); setOpen(false); }}>
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu__shortcut">{item.shortcut}</span>}
                  </button>
                </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Компонент выбора масштаба
function ZoomSelect({ zoom, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const commit = (raw) => {
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) onChange(n / 100);
    setEditing(false);
  };

  if (editing) {
    return (
      <input className="zoom-input" value={val} autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={() => commit(val)}
        onKeyDown={e => { if (e.key === 'Enter') commit(val); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }
  return (
    <div className="zoom-select">
      <span className="zoom-select__display"
        onClick={() => { setVal(String(Math.round(zoom * 100))); setEditing(true); }}>
        {fmtZoom(zoom)}
      </span>
      <select className="zoom-select__arrow" value="" onChange={e => { onChange(parseFloat(e.target.value)); e.target.value = ''; }}>
        <option value="" disabled>·</option>
        {ZOOM_PRESETS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
      </select>
    </div>
  );
}

// Иконки
const IconZoomIn  = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><line x1="9.9" y1="9.9" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="4.5" y1="6.5" x2="8.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="6.5" y1="4.5" x2="6.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const IconZoomOut = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><line x1="9.9" y1="9.9" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="4.5" y1="6.5" x2="8.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const IconZoomTool = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><line x1="9.9" y1="9.9" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="4.5" y1="6.5" x2="8.5" y2="6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="6.5" y1="4.5" x2="6.5" y2="8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconHand    = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2a.75.75 0 011.5 0v4.25h.25V3.5a.75.75 0 011.5 0v2.75h.25V4a.75.75 0 011.5 0v2.25h.25V5.25a.75.75 0 011.5 0V10a4.25 4.25 0 01-4.25 4.25H7A3.25 3.25 0 013.75 11V7A1.25 1.25 0 016 7v1h.25V2z"/></svg>;
const IconOpen    = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h4.17l2 2H14a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3zm5.83 0H3v9h11V5H8.83l-1-2z"/></svg>;

// Основная часть приложения
export default function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(localStorage.getItem('language') || i18n.resolvedLanguage || 'en');
  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  }, [language, i18n]);

  const [imageInfo]  = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState('zoom');
  const [zoom]       = useState(1);

  const noop = () => {};
  const cursor = activeTool === 'hand' ? 'grab' : 'crosshair';
  const activeToolLabel = activeTool === 'hand' ? t('info.hand') : t('info.zoomTool');

  const fileMenuItems = [
    { label: t('menu.open'),           shortcut: 'Ctrl+O',       action: noop },
    '---',
    { label: t('menu.exportPng'),      shortcut: 'Ctrl+S',       disabled: true, action: noop },
    { label: t('menu.exportJpeg'),     shortcut: 'Ctrl+Shift+S', disabled: true, action: noop },
    { label: t('menu.exportGb7'),      shortcut: 'Ctrl+Alt+S',   disabled: true, action: noop },
  ];

  const viewMenuItems = [
    { label: t('menu.zoomIn'),        shortcut: '+',      action: noop },
    { label: t('menu.zoomOut'),       shortcut: '−',      action: noop },
    '---',
    { label: t('menu.fitScreen'),     shortcut: 'Ctrl+0', disabled: true, action: noop },
    { label: t('menu.actualSize'),    shortcut: 'Ctrl+1', disabled: true, action: noop },
    '---',
    ...ZOOM_PRESETS.map(p => ({ label: p.label, disabled: true, action: noop })),
  ];

  const settingsMenuItems = [
    { label: t('menu.languageEnglish'), disabled: language === 'en', action: () => setLanguage('en') },
    { label: t('menu.languageRussian'), disabled: language === 'ru', action: () => setLanguage('ru') },
  ];

  const onDrop     = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = ()  => setIsDragging(false);

  return (
    <div className="app" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>

      {/* Панель меню */}
      <div className="menubar">
        <span className="menubar__brand">
          <span className="menubar__logo-mark" aria-hidden="true">P</span>
          <span className="menubar__logo-text">PhotoShopp</span>
        </span>
        <Menu label={t('menu.file')} items={fileMenuItems} />
        <Menu label={t('menu.view')} items={viewMenuItems} />
        <Menu label={t('menu.settings')} items={settingsMenuItems} />
        <span className="menubar__ghost">Image</span>
        <span className="menubar__ghost">Filter</span>
        <span className="menubar__ghost">Help</span>
        <input type="file" accept=".png,.jpg,.jpeg,.gb7"
          style={{ display: 'none' }} onChange={() => {}} />
      </div>

      {/* Панель инструментов */}
      <div className="toolbar">
        <div className="tbar-group tbar-group--zoom">
          <button className="tbtn tbtn--icon" title={t('toolbar.zoomOutTitle')} onClick={noop} disabled><IconZoomOut /></button>
          <ZoomSelect zoom={zoom} onChange={noop} />
          <button className="tbtn tbtn--icon" title={t('toolbar.zoomInTitle')} onClick={noop}  disabled><IconZoomIn /></button>
          <div className="tbar-sep" />
          <button className="tbtn" title={t('toolbar.fitTitle')} onClick={noop} disabled>{t('toolbar.fit')}</button>
          <button className="tbtn" title={t('toolbar.actualTitle')} onClick={noop}   disabled>{t('toolbar.actual')}</button>
        </div>

        <div className="tbar-group tbar-group--right">
          {imageInfo && <span className="tbar-dim">{imageInfo.width} × {imageInfo.height} px</span>}
        </div>
      </div>

      {/* Основная область в три колонки */}
      <div className="main">

        {/* Левая панель инструментов */}
        <aside className="tools">
          <button className={`tool${activeTool === 'zoom' ? ' tool--active' : ''}`}
            title="Zoom (Z)" onClick={() => setActiveTool('zoom')}>
            <IconZoomTool />
          </button>
          <button className={`tool${activeTool === 'hand' ? ' tool--active' : ''}`}
            title="Hand / Pan (H)" onClick={() => setActiveTool('hand')}>
            <IconHand />
          </button>
          <div className="tools__sep" />
          {/* Заглушки для инструментов */}
          {[0,1,2,3].map(i => (
            <button key={i} className="tool tool--placeholder" disabled title="Coming soon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3.5" y="3.5" width="9" height="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
              </svg>
            </button>
          ))}
        </aside>

        {/* Область просмотра */}
        <div
          className={`viewport${isDragging ? ' viewport--drag' : ''}`}
          style={{ cursor }}
        >
          {isDragging && (
            <div className="drop-overlay">Drop to open</div>
          )}

          {!imageInfo && !error && (
            <div className="empty">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="empty__icon">
                <rect x="6" y="12" width="44" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
                <circle cx="19" cy="23" r="4" stroke="currentColor" strokeWidth="1.5" opacity=".5"/>
                <path d="M6 36l12-10 9 7 8-6 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/>
              </svg>
              <p className="empty__title">{t('empty.title')}</p>
              <p className="empty__sub">{t('empty.sub').split('Ctrl+O').map((part, i, arr) => (
                <span key={i}>{part}{i < arr.length - 1 && <kbd>Ctrl+O</kbd>}</span>
              ))}</p>
              <p className="empty__formats">{t('empty.formats')}</p>
            </div>
          )}

          {error && (
            <div className="error-toast">
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)}>{t('error.close')}</button>
            </div>
          )}

          <div className="scene"
            style={{
              position: 'absolute',
              left: 0, top: 0,
              width: imageInfo?.width ?? 1,
              height: imageInfo?.height ?? 1,
              transformOrigin: '0 0',
              transform: `translate(0px,0px) scale(${zoom})`,
              willChange: 'transform',
              visibility: imageInfo ? 'visible' : 'hidden',
              pointerEvents: imageInfo ? 'auto' : 'none',
            }}
          >
            <canvas className="image-canvas" />
          </div>
        </div>

        {/* Правая панель информации */}
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
              <dt>{t('info.zoom')}</dt>  <dd className="info-accent">{fmtZoom(zoom)}</dd>
              <dt>{t('info.tool')}</dt>  <dd>{activeToolLabel}</dd>
            </dl>
          </section>

          <section className="info-section info-section--shortcuts">
            <h3 className="info-section__title">{t('info.shortcuts')}</h3>
            <dl className="info-list info-list--small">
              <dt>{t('info.scroll')}</dt>        <dd>{t('info.zoomStep')}</dd>
              <dt>{t('info.pan')}</dt>          <dd>{t('info.hand')}</dd>
              <dt>+/−</dt>                     <dd>{t('info.zoomStep')}</dd>
              <dt>Ctrl+0</dt>                 <dd>{t('info.fit')}</dd>
              <dt>Ctrl+1</dt>                 <dd>{t('info.actual')}</dd>
              <dt>H</dt>                      <dd>{t('info.hand')}</dd>
              <dt>Z</dt>                      <dd>{t('info.zoomTool')}</dd>
            </dl>
          </section>
        </aside>
      </div>

      {/* Строка состояния */}
      <footer className="statusbar">
        <span className="sb-file">{imageInfo?.filename ?? 'No file open'}</span>
        {imageInfo && <>
          <span className="sb-sep" />
          <span className="sb-item">{imageInfo.width} × {imageInfo.height} px</span>
          <span className="sb-sep" />
          <span className="sb-item">{imageInfo.depth}</span>
          <span className="sb-sep" />
          <span className="sb-item sb-format">{imageInfo.format}</span>
        </>}
        <span className="sb-spacer" />
        <span className="sb-zoom">{fmtZoom(zoom)}</span>
      </footer>
    </div>
  );
}