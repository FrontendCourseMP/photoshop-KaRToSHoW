import { useState, useRef, useMemo, useEffect } from 'react';
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
import ResizeDialog from './components/dialogs/ResizeDialog';
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
  const [showResize, setShowResize] = useState(false);
  const [resizeOriginalImageData, setResizeOriginalImageData] = useState(null);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const { error, setError, clearError } = useErrorState();

  const viewport = useViewportControls(imageInfo, viewportRef);
  const { zoom, offset, activeTool, setActiveTool, cursor, fitToScreen, fillToScreen, zoomTo100, zoomIn, zoomOut, zoomToArea, zoomOutFromArea, handleZoomChange, onMouseDown } = viewport;
  const [zoomMode, setZoomMode] = useState('in');

  const { handleFile, saveAs } = useImageManager({
    canvasRef,
    setImageInfo,
    setOriginalImageData,
    setChannels,
    setError,
    t,
  });
  const fileInputRef = useRef(null);

  // Сбрасываем пипетку при каждой смене изображения
  useEffect(() => { setEyedropper(null); }, [imageInfo]);

  useEffect(() => {
    if (!originalImageData || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const w = originalImageData.width, h = originalImageData.height;
    const src = originalImageData.data;
    const out = new Uint8ClampedArray(src.length);
    const isGray = 'Gray' in channels;
    const showR = !!channels.R;
    const showG = !!channels.G;
    const showB = !!channels.B;
    const showGray = !!channels.Gray;
    const showA = !!channels.A;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
      let nr = 0, ng = 0, nb = 0;
      if (isGray) {
        if (showGray && showA) {
          // Маска как множитель: чёрный где mask=0, оригинальный серый где mask=255
          nr = ng = nb = a > 0 ? r : 0;
        } else if (showGray) {
          nr = ng = nb = r;
        } else if (showA) {
          nr = ng = nb = a; // только маска — непрозрачный B&W
        }
      } else {
        nr = showR ? r : 0;
        ng = showG ? g : 0;
        nb = showB ? b : 0;
        if (!showR && !showG && !showB && showA) nr = ng = nb = a;
      }
      // Grayscale — всегда непрозрачный (маска видна как чёрные пиксели, не шахматка).
      // RGB — прозрачность только при совместном показе цветовых каналов + A.
      const na = isGray ? 255 : (showA && (showR || showG || showB) ? a : 255);
      out[i] = nr; out[i + 1] = ng; out[i + 2] = nb; out[i + 3] = na;
    }
    ctx.putImageData(new ImageData(out, w, h), 0, 0);
  }, [originalImageData, channels]);

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
    onShowResize: () => {
      if (!originalImageData) return;
      setResizeOriginalImageData(new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height));
      setShowResize(true);
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
      showResize: () => {
        if (!originalImageData) return;
        setResizeOriginalImageData(new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height));
        setShowResize(true);
      },
      themeLight: () => setThemeMode('light'),
      themeDark: () => setThemeMode('dark'),
      languageEnglish: () => setLanguage('en'),
      languageRussian: () => setLanguage('ru'),
    },
    file: [
      { label: t('menu.open'), actionKey: 'browse', shortcut: 'Ctrl+O' },
      '---',
      { label: t('resize.open'), disabled: !imageInfo, actionKey: 'showResize' },
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
  }), [t, imageInfo, handleFile, saveAs, zoomIn, zoomOut, fitToScreen, zoomTo100, handleZoomChange, setLanguage, themeMode, originalImageData, setShowResize, setResizeOriginalImageData]);

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
          imageInfo={imageInfo}
          originalImageData={levelsOriginalImageData}
          canvasRef={canvasRef}
          themeMode={themeMode}
          onClose={() => setShowLevels(false)}
          onApply={(newImageData) => {
            setOriginalImageData(new ImageData(
              new Uint8ClampedArray(newImageData.data),
              newImageData.width,
              newImageData.height,
            ));
          }}
        />
      )}
      {showResize && (
        <ResizeDialog
          t={t}
          imageInfo={imageInfo}
          originalImageData={resizeOriginalImageData}
          onClose={() => setShowResize(false)}
          onApply={(newImageData, newW, newH) => {
            if (canvasRef.current) {
              canvasRef.current.width  = newW;
              canvasRef.current.height = newH;
            }
            setOriginalImageData(newImageData);
            setImageInfo(prev => prev ? { ...prev, width: newW, height: newH } : prev);
            requestAnimationFrame(fitToScreen);
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
            onMouseDown?.(e);
            if (e.button === 0 && activeTool === 'eyedropper' && imageInfo && originalImageData) {
              try {
                const vp = viewportRef.current;
                const rect = vp.getBoundingClientRect();
                const imgX = Math.floor((e.clientX - rect.left - offset.x) / zoom);
                const imgY = Math.floor((e.clientY - rect.top  - offset.y) / zoom);
                const { width, height, data } = originalImageData;
                if (imgX >= 0 && imgY >= 0 && imgX < width && imgY < height) {
                  const idx = (imgY * width + imgX) * 4;
                  const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
                  setEyedropper({ x: imgX, y: imgY, r, g, b, a, lab: rgbToLab(r, g, b) });
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

          <div className="info-section levels-trigger">
            <h3 className="info-section__title">
              {t('levels.title')}
              <span className="levels-trigger__kbd" style={{ marginLeft: 'auto' }}>Ctrl+L</span>
            </h3>
            <button
              className="levels-trigger__btn"
              disabled={!imageInfo}
              onClick={() => {
                setLevelsOriginalImageData(originalImageData
                  ? new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height)
                  : null);
                setShowLevels(true);
              }}
            >
              {t('levels.open')}
            </button>
          </div>

          <div className="info-section levels-trigger">
            <h3 className="info-section__title">{t('resize.title')}</h3>
            <button
              className="levels-trigger__btn"
              disabled={!imageInfo}
              onClick={() => {
                if (!originalImageData) return;
                setResizeOriginalImageData(new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height));
                setShowResize(true);
              }}
            >
              {t('resize.open')}
            </button>
          </div>
        </div>
      </div>

      {/* Строка состояния */}
      <StatusBar t={t} imageInfo={imageInfo} zoom={formatZoom(zoom)} />
    </div>
  );
}
