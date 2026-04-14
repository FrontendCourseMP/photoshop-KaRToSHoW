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
import StatusBar from './components/layout/StatusBar';
import ErrorBanner from './components/ui/ErrorBanner';
import ThemeSettings from './components/ui/ThemeSettings';

// Корневой компонент приложения, собирает хуки и визуальные блоки
export default function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useLanguage(i18n);

  const canvasRef   = useRef(null);
  const viewportRef = useRef(null);

  const [imageInfo, setImageInfo] = useState(null);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#5B8CFF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const { error, setError, clearError } = useErrorState();

  const viewport = useViewportControls(imageInfo, viewportRef);
  const { zoom, offset, activeTool, setActiveTool, cursor, fitToScreen, zoomTo100, zoomIn, zoomOut, zoomToArea, handleZoomChange, onMouseDown } = viewport;

  // Рисует полученные данные изображения на canvas и обновляет размеры
  const drawImageData = useCallback((imgData) => {
    const c = canvasRef.current;
    c.width = imgData.width; c.height = imgData.height;
    c.getContext('2d').putImageData(imgData, 0, 0);
  }, []);

  const { handleFile, saveAs } = useImageManager({ canvasRef, drawImageData, setImageInfo, setError, t });
  const fileInputRef = useRef(null);

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
  }), [zoomIn, zoomOut, fitToScreen, zoomTo100, setActiveTool]);

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
    ],
    settings: [
      { label: t('menu.themeSettings'), actionKey: 'showThemeSettings', shortcut: 'Ctrl+Shift+C' },
    ],
  }), [t, imageInfo, handleFile, saveAs, zoomIn, zoomOut, fitToScreen, zoomTo100, handleZoomChange, language, setLanguage, themeMode]);

  const activeToolLabel = activeTool === 'hand' ? t('info.hand') : t('info.zoomTool');

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
      <ErrorBanner t={t} error={error} onClose={clearError} />

      {/* Панель инструментов */}
      <Toolbar
        t={t}
        imageInfo={imageInfo}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        fitToScreen={fitToScreen}
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
          zoomToArea={zoomToArea}
          onMouseDown={onMouseDown}
          onOpenFile={handleFile}
          onError={setError}
          canvasRef={canvasRef}
          viewportRef={viewportRef}
          clearError={clearError}
          offset={offset}
          zoom={zoom}
        />

        {/* Правая панель информации */}
        <InfoPanel t={t} imageInfo={imageInfo} zoom={formatZoom(zoom)} activeToolLabel={activeToolLabel} />
      </div>

      {/* Строка состояния */}
      <StatusBar t={t} imageInfo={imageInfo} zoom={formatZoom(zoom)} />
    </div>
  );
}