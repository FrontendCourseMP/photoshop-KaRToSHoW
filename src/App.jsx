import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatZoom } from './utils/zoom';
import useLanguage from './hooks/useLanguage';
import useImageManager from './hooks/useImageManager';
import useViewportControls from './hooks/useViewportControls';
import useErrorState from './hooks/useErrorState';
import './App.css';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import ToolsPanel from './components/ToolsPanel';
import Viewport from './components/Viewport';
import InfoPanel from './components/InfoPanel';
import StatusBar from './components/StatusBar';
import ErrorBanner from './components/ErrorBanner';

// Корневой компонент приложения, собирает хуки и визуальные блоки
export default function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useLanguage(i18n);

  const canvasRef   = useRef(null);
  const viewportRef = useRef(null);

  const [imageInfo, setImageInfo] = useState(null);
  const { error, setError, clearError } = useErrorState();

  const viewport = useViewportControls(imageInfo, viewportRef);
  const { zoom, offset, activeTool, setActiveTool, cursor, fitToScreen, zoomTo100, zoomIn, zoomOut, handleZoomChange, onMouseDown } = viewport;

  // Рисует полученные данные изображения на canvas и обновляет размеры
  const drawImageData = useCallback((imgData) => {
    const c = canvasRef.current;
    c.width = imgData.width; c.height = imgData.height;
    c.getContext('2d').putImageData(imgData, 0, 0);
  }, []);

  const { handleFile, saveAs } = useImageManager({ canvasRef, drawImageData, setImageInfo, setError, t });

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
    },
    file: [
      { label: t('menu.open'), actionKey: 'browse' },
      '---',
      { label: t('menu.exportPng'), disabled: !imageInfo, actionKey: 'exportPng' },
      { label: t('menu.exportJpeg'), disabled: !imageInfo, actionKey: 'exportJpeg' },
      { label: t('menu.exportGb7'), disabled: !imageInfo, actionKey: 'exportGb7' },
    ],
    view: [
      { label: t('menu.zoomIn'), actionKey: 'zoomIn' },
      { label: t('menu.zoomOut'), actionKey: 'zoomOut' },
      '---',
      { label: t('menu.fitScreen'), disabled: !imageInfo, actionKey: 'fitScreen' },
      { label: t('menu.actualSize'), disabled: !imageInfo, actionKey: 'actualSize' },
      '---',
      ...[25, 50, 100, 200, 400].map(v => ({ label: `${v}%`, disabled: !imageInfo, action: () => handleZoomChange(v / 100) })),
    ],
    settings: [
      { label: t('menu.languageEnglish'), disabled: language === 'en', action: () => setLanguage('en') },
      { label: t('menu.languageRussian'), disabled: language === 'ru', action: () => setLanguage('ru') },
    ],
  }), [t, imageInfo, handleFile, saveAs, zoomIn, zoomOut, fitToScreen, zoomTo100, handleZoomChange, language, setLanguage]);

  const activeToolLabel = activeTool === 'hand' ? t('info.hand') : t('info.zoomTool');

  return (
    <div className="app">

      <MenuBar menuConfig={menuConfig} />
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