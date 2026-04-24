import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatZoom } from './utils/zoom';
import useLanguage from './hooks/useLanguage';
import useImageManager from './hooks/useImageManager';
import useViewportControls from './hooks/useViewportControls';
import useErrorState from './hooks/useErrorState';
import useHotkeys from './hooks/useHotkeys';
import './App.css';

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function lightenColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const rr = Math.round(r + (255 - r) * amount);
  const gg = Math.round(g + (255 - g) * amount);
  const bb = Math.round(b + (255 - b) * amount);
  return `rgb(${rr}, ${gg}, ${bb})`;
}
import MenuBar from './components/layout/MenuBar';
import Toolbar from './components/controls/Toolbar';
import ToolsPanel from './components/controls/ToolsPanel';
import Viewport from './components/view/Viewport';
import InfoPanel from './components/layout/InfoPanel';
import ChannelsPanel from './components/layout/ChannelsPanel';
import StatusBar from './components/layout/StatusBar';
import ErrorBanner from './components/ui/ErrorBanner';
import ThemeSettings from './components/ui/ThemeSettings';
import LevelsDialog from './components/dialogs/LevelsDialog';
import { rgbToLab } from './utils/color';

// Корневой компонент приложения, собирает хуки и визуальные блоки
export default function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useLanguage(i18n);

  const canvasRef   = useRef(null);
  const viewportRef = useRef(null);

  const [imageInfo, setImageInfo] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [channels, setChannels] = useState({});
  const [eyedropper, setEyedropper] = useState(null);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#5B8CFF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
  const [showLevels, setShowLevels] = useState(false);
  const [levelsOriginalImageData, setLevelsOriginalImageData] = useState(null);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const { error, setError, clearError } = useErrorState();

  const viewport = useViewportControls(imageInfo, viewportRef);
  const { zoom, offset, activeTool, setActiveTool, cursor, fitToScreen, fillToScreen, zoomTo100, zoomIn, zoomOut, zoomToArea, zoomOutFromArea, handleZoomChange, onMouseDown } = viewport;
  const [zoomMode, setZoomMode] = useState('in');

  // Рисует полученные данные изображения на canvas и обновляет размеры
  const drawImageData = useCallback((imgData) => {
    const c = canvasRef.current;
    c.width = imgData.width; c.height = imgData.height;
    c.getContext('2d').putImageData(imgData, 0, 0);
  }, []);

  const { handleFile, saveAs } = useImageManager({ canvasRef, drawImageData, setImageInfo, setError, t });
  const fileInputRef = useRef(null);

  // When a new image is loaded, capture immutable original pixel data and initialize channels
  useEffect(() => {
    if (!imageInfo || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    try {
      const d = ctx.getImageData(0, 0, c.width, c.height);
      // keep a copy
      const copy = new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
      setOriginalImageData(copy);
      const isGray = (imageInfo.depth || '').toLowerCase().includes('gray');
      const hasAlpha = (imageInfo.depth || '').toLowerCase().includes('alpha') || (imageInfo.depth || '').toLowerCase().includes('rgba');
      if (isGray) {
        setChannels({ Gray: true, A: !!hasAlpha });
      } else {
        setChannels({ R: true, G: true, B: true, A: !!hasAlpha });
      }
      setEyedropper(null);
    } catch (err) {
      console.warn('Failed to capture original image data', err);
    }
  }, [imageInfo]);

  // Apply channel toggles by composing a new ImageData from original
  useEffect(() => {
    if (!originalImageData || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const w = originalImageData.width, h = originalImageData.height;
    const src = originalImageData.data;
    const out = new Uint8ClampedArray(src.length);
    const isGray = (imageInfo?.depth || '').toLowerCase().includes('gray');
    const showR = !!channels.R; const showG = !!channels.G; const showB = !!channels.B; const showGray = !!channels.Gray; const showA = !!channels.A;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
      let nr = 0, ng = 0, nb = 0, na = 255;
      if (isGray) {
        if (showGray) nr = ng = nb = r;
        if (showA && !showGray) nr = ng = nb = a;
      } else {
        nr = showR ? r : 0;
        ng = showG ? g : 0;
        nb = showB ? b : 0;
        if (!showR && !showG && !showB && showA) {
          // only alpha visible -> show mask
          nr = ng = nb = a;
        }
      }
      na = showA ? a : 255;
      out[i] = nr; out[i + 1] = ng; out[i + 2] = nb; out[i + 3] = na;
    }
    ctx.putImageData(new ImageData(out, w, h), 0, 0);
  }, [imageInfo, originalImageData, channels]);

  const accentSoft = useMemo(() => lightenColor(accentColor, 0.6), [accentColor]);
  const accentBg = useMemo(() => {
    const { r, g, b } = hexToRgb(accentColor);
    return `rgba(${r}, ${g}, ${b}, 0.14)`;
  }, [accentColor]);
  const accentBorder = useMemo(() => {
    const { r, g, b } = hexToRgb(accentColor);
    return `rgba(${r}, ${g}, ${b}, 0.28)`;
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('themeMode', themeMode);
  }, [accentColor, themeMode]);

  const hotkeys = useMemo(() => ({
    onOpenFile: () => fileInputRef.current?.click(),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFitScreen: fitToScreen,
    onActualSize: zoomTo100,
    onZoomTool: () => setActiveTool('zoom'),
    onHandTool: () => setActiveTool('hand'),
    onEyedropperTool: () => setActiveTool('eyedropper'),
    onShowLevels: () => {
      setLevelsOriginalImageData(originalImageData ? new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height) : null);
      setShowLevels(true);
    },
  }), [zoomIn, zoomOut, fitToScreen, zoomTo100, setActiveTool, originalImageData]);

  useHotkeys(hotkeys);

  // Декларативная конфигурация меню для MenuBar
  const menuConfig = useMemo(() => ({
    fileLabel: t('menu.file'),
    viewLabel: t('menu.view'),
    settingsLabel: t('menu.settings'),
    fileAccept: '.png,.jpg,.jpeg,.gb7',
    actions: {
      onOpenFile: handleFile,
      exportPng: () => saveAs('png', imageInfo),
      exportJpeg: () => saveAs('jpg', imageInfo),
      exportGb7: () => saveAs('gb7', imageInfo),
      zoomIn,
      zoomOut,
      fitScreen: fitToScreen,
      actualSize: zoomTo100,
      zoomPreset: handleZoomChange,
      setLanguage,
      showThemeSettings: () => setShowThemeSettings(true),
      showLevels: () => {
        setLevelsOriginalImageData(originalImageData ? new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height) : null);
        setShowLevels(true);
      },
      themeLight: () => setThemeMode('light'),
      themeDark: () => setThemeMode('dark'),
      languageEnglish: () => setLanguage('en'),
      languageRussian: () => setLanguage('ru'),
    },
    file: [
      { label: t('menu.open'), actionKey: 'browse', shortcut: 'Ctrl+O' },
      '---',
      { label: t('menu.exportPng'), disabled: !imageInfo, actionKey: 'exportPng' },
      { label: t('menu.exportJpeg'), disabled: !imageInfo, actionKey: 'exportJpeg' },
      { label: t('menu.exportGb7'), disabled: !imageInfo, actionKey: 'exportGb7' },
    ],
    view: [
      { label: t('menu.zoomIn'), actionKey: 'zoomIn', shortcut: 'Ctrl++' },
      { label: t('menu.zoomOut'), actionKey: 'zoomOut', shortcut: 'Ctrl+-' },
      '---',
      { label: t('menu.fitScreen'), disabled: !imageInfo, actionKey: 'fitScreen', shortcut: 'Ctrl+2' },
      { label: t('menu.actualSize'), disabled: !imageInfo, actionKey: 'actualSize', shortcut: 'Ctrl+1' },
      '---',
      ...[25, 50, 100, 200, 400].map(v => ({ label: `${v}%`, disabled: !imageInfo, action: () => handleZoomChange(v / 100) })),
      '---',
      { label: t('levels.title'), disabled: !imageInfo, actionKey: 'showLevels', shortcut: 'Ctrl+L' },
    ],
    settings: [
      { label: t('menu.themeSettings'), actionKey: 'showThemeSettings', shortcut: 'Ctrl+Shift+C' },
    ],
  }), [t, imageInfo, handleFile, saveAs, zoomIn, zoomOut, fitToScreen, zoomTo100, handleZoomChange, setLanguage, themeMode, originalImageData]);

  const activeToolLabel = activeTool === 'hand' ? t('info.hand') : activeTool === 'eyedropper' ? t('info.eyedropper') || 'Eyedropper' : t('info.zoomTool');

  return (
    <div className={`app theme-${themeMode}`} style={{
      '--c-accent': accentColor,
      '--c-accent-2': accentSoft,
      '--c-accent-bg': accentBg,
      '--c-accent-border': accentBorder,
    }}>

      <MenuBar menuConfig={menuConfig} fileInputRef={fileInputRef} />
      {showThemeSettings && (
        <ThemeSettings
          t={t}
          themeMode={themeMode}
          accentColor={accentColor}
          language={language}
          onClose={() => setShowThemeSettings(false)}
          onThemeModeChange={setThemeMode}
          onAccentColorChange={setAccentColor}
          onLanguageChange={setLanguage}
        />
      )}
      {showLevels && (
        <LevelsDialog
          t={t}
          originalImageData={levelsOriginalImageData}
          imageInfo={imageInfo}
          canvasRef={canvasRef}
          onClose={() => setShowLevels(false)}
          onApply={(newImageData) => {
            if (originalImageData) {
              // Update original for next operation
              const ctx = canvasRef.current.getContext('2d');
              ctx.putImageData(newImageData, 0, 0);
            }
          }}
        />
      )}
      <ErrorBanner t={t} error={error} onClose={clearError} />

      {/* Панель инструментов */}
      <Toolbar
        t={t}
        imageInfo={imageInfo}
        activeTool={activeTool}
        zoomMode={zoomMode}
        onSetZoomMode={setZoomMode}
        fitToScreen={fitToScreen}
        fillToScreen={fillToScreen}
        zoomTo100={zoomTo100}
      />

      {/* Основная область в три колонки */}
      <div className="main">

        <ToolsPanel t={t} activeTool={activeTool} setActiveTool={setActiveTool} />

        <Viewport
          t={t}
          imageInfo={imageInfo}
          cursor={cursor}
          activeTool={activeTool}
          zoomMode={zoomMode}
          zoomToArea={zoomToArea}
          zoomOutFromArea={zoomOutFromArea}
          onMouseDown={(e) => {
            // keep panning behavior
            onMouseDown?.(e);
            // Eyedropper handling: left click
            if (e.button === 0 && activeTool === 'eyedropper' && imageInfo && canvasRef.current) {
              try {
                const vp = viewportRef.current;
                const rect = vp.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                const imgX = Math.floor((px - offset.x) / zoom);
                const imgY = Math.floor((py - offset.y) / zoom);
                const c = canvasRef.current;
                const ctx = c.getContext('2d');
                if (imgX >= 0 && imgY >= 0 && imgX < c.width && imgY < c.height) {
                  const d = ctx.getImageData(imgX, imgY, 1, 1).data;
                  const r = d[0], g = d[1], b = d[2];
                  const lab = rgbToLab(r, g, b);
                  setEyedropper({ x: imgX, y: imgY, r, g, b, a: d[3], lab });
                }
              } catch (err) {
                console.warn('Eyedropper failed', err);
              }
            }
          }}
          onOpenFile={handleFile}
          onError={setError}
          canvasRef={canvasRef}
          viewportRef={viewportRef}
          clearError={clearError}
          offset={offset}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          fitToScreen={fitToScreen}
          zoomTo100={zoomTo100}
        />

        {/* Правая панель информации */}
        <div className="right-panel">
          <InfoPanel t={t} imageInfo={imageInfo} zoom={formatZoom(zoom)} activeToolLabel={activeToolLabel} eyedropper={eyedropper} />
          <ChannelsPanel t={t} imageInfo={imageInfo} originalImageData={originalImageData} channels={channels} setChannels={setChannels} />
        </div>
      </div>

      {/* Строка состояния */}
      <StatusBar t={t} imageInfo={imageInfo} zoom={formatZoom(zoom)} />
    </div>
  );
}
