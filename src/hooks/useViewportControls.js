import { useState, useRef, useEffect, useCallback } from 'react';
import { centerOffset, fitZoom, fillZoom, clamp, zoomBy, sliderToZoom, zoomToSlider } from '../utils/zoom';

// Хук для управления масштабом, смещением и инструментами просмотра
export default function useViewportControls(imageInfo, viewportRef) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('zoom');

  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Устанавливает масштаб так, чтобы изображение полностью помещалось в область
  const fitToScreen = useCallback(() => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const z = fitZoom(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height);
    setZoom(z);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, z));
  }, [imageInfo, viewportRef]);

  const fillToScreen = useCallback(() => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const z = fillZoom(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height);
    setZoom(z);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, z));
  }, [imageInfo, viewportRef]);

  const zoomTo100 = useCallback(() => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    setZoom(1);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, 1));
  }, [imageInfo, viewportRef]);

  useEffect(() => { if (imageInfo) fitToScreen(); }, [imageInfo, fitToScreen]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // zoomBy использует sliderToZoom/zoomToSlider — вся интерполяция через одну функцию
      const nz = zoomBy(zoomRef.current, e.deltaY < 0 ? 1 : -1);
      const cx = (px - offsetRef.current.x) / zoomRef.current;
      const cy = (py - offsetRef.current.y) / zoomRef.current;
      const newOffset = { x: px - cx * nz, y: py - cy * nz };
      // Обновляем рефы синхронно — следующее событие до рендера прочитает актуальное значение
      zoomRef.current = nz;
      offsetRef.current = newOffset;
      setZoom(nz);
      setOffset(newOffset);
    };
    vp.addEventListener('wheel', handler, { passive: false });
    return () => vp.removeEventListener('wheel', handler);
  }, [viewportRef]);

  const stepZoom = useCallback((sign) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const nz = zoomBy(zoomRef.current, sign);
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const imgCx = (cx - offsetRef.current.x) / zoomRef.current;
    const imgCy = (cy - offsetRef.current.y) / zoomRef.current;
    const newOffset = { x: cx - imgCx * nz, y: cy - imgCy * nz };
    zoomRef.current = nz;
    offsetRef.current = newOffset;
    setZoom(nz);
    setOffset(newOffset);
  }, [viewportRef]);

  const zoomIn  = useCallback(() => stepZoom(+1), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(-1), [stepZoom]);

  const zoomPreset = useCallback((value) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const cz = clamp(value);
    setZoom(cz);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, cz));
  }, [imageInfo, viewportRef]);

  const zoomToArea = useCallback((selection) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const x1 = selection.x;
    const y1 = selection.y;
    const x2 = selection.x + selection.width;
    const y2 = selection.y + selection.height;

    const imgX1 = (x1 - offsetRef.current.x) / zoomRef.current;
    const imgY1 = (y1 - offsetRef.current.y) / zoomRef.current;
    const imgX2 = (x2 - offsetRef.current.x) / zoomRef.current;
    const imgY2 = (y2 - offsetRef.current.y) / zoomRef.current;

    const selW = Math.max(1, imgX2 - imgX1);
    const selH = Math.max(1, imgY2 - imgY1);
    // Прогоняем через sliderToZoom(zoomToSlider()) — единая точка интерполяции
    const nextZoom = sliderToZoom(zoomToSlider(Math.min(vp.clientWidth / selW, vp.clientHeight / selH)));
    const centerX = (imgX1 + imgX2) / 2;
    const centerY = (imgY1 + imgY2) / 2;

    setZoom(nextZoom);
    setOffset({
      x: vp.clientWidth / 2 - nextZoom * centerX,
      y: vp.clientHeight / 2 - nextZoom * centerY,
    });
  }, [imageInfo, viewportRef]);

  const zoomOutFromArea = useCallback((selection) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const x1 = selection.x;
    const y1 = selection.y;
    const x2 = selection.x + selection.width;
    const y2 = selection.y + selection.height;

    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const imgCenterX = (centerX - offsetRef.current.x) / zoomRef.current;
    const imgCenterY = (centerY - offsetRef.current.y) / zoomRef.current;
    const factor = Math.min(selection.width / vp.clientWidth, selection.height / vp.clientHeight, 1);
    // Прогоняем через sliderToZoom(zoomToSlider()) — единая точка интерполяции
    const nextZoom = sliderToZoom(zoomToSlider(zoomRef.current * factor));

    setZoom(nextZoom);
    setOffset({
      x: vp.clientWidth / 2 - nextZoom * imgCenterX,
      y: vp.clientHeight / 2 - nextZoom * imgCenterY,
    });
  }, [imageInfo, viewportRef]);

  // Применяет произвольный уровень масштабирования и центрирует изображение
  const handleZoomChange = useCallback((z) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    const cz = clamp(z);
    setZoom(cz);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, cz));
  }, [imageInfo, viewportRef]);

  const onMouseDown = useCallback((e) => {
    const isPan = e.button === 1 || activeTool === 'hand';
    if (!isPan) return;
    e.preventDefault();

    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const sx = e.clientX;
    const sy = e.clientY;

    const onMove = (ev) => {
      setOffset({ x: ox + ev.clientX - sx, y: oy + ev.clientY - sy });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [activeTool]);

  const cursor = activeTool === 'hand' ? 'grab' : 'crosshair';

  return {
    zoom,
    offset,
    activeTool,
    setActiveTool,
    cursor,
    fitToScreen,
    fillToScreen,
    zoomTo100,
    zoomIn,
    zoomOut,
    zoomPreset,
    zoomToArea,
    zoomOutFromArea,
    handleZoomChange,
    onMouseDown,
  };
}
