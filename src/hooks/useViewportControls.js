import { useState, useRef, useEffect, useCallback } from 'react';
import { zoomToward, centerOffset, fitZoom, ZOOM_FACTOR } from '../utils/zoom';

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
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const r = zoomToward(zoomRef.current, offsetRef.current, px, py, factor);
      setZoom(r.zoom);
      setOffset(r.offset);
    };
    vp.addEventListener('wheel', handler, { passive: false });
    return () => vp.removeEventListener('wheel', handler);
  }, [viewportRef]);

  const stepZoom = useCallback((factor) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const r = zoomToward(zoomRef.current, offsetRef.current, cx, cy, factor);
    setZoom(r.zoom);
    setOffset(r.offset);
  }, [viewportRef]);

  const zoomIn = useCallback(() => stepZoom(ZOOM_FACTOR), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(1 / ZOOM_FACTOR), [stepZoom]);

  const zoomPreset = useCallback((value) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    setZoom(value);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, value));
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
    const nextZoom = Math.min(vp.clientWidth / selW, vp.clientHeight / selH);
    const centerX = (imgX1 + imgX2) / 2;
    const centerY = (imgY1 + imgY2) / 2;

    setZoom(nextZoom);
    setOffset({
      x: vp.clientWidth / 2 - nextZoom * centerX,
      y: vp.clientHeight / 2 - nextZoom * centerY,
    });
  }, [imageInfo, viewportRef]);

  // Применяет произвольный уровень масштабирования и центрирует изображение
  const handleZoomChange = useCallback((z) => {
    if (!imageInfo || !viewportRef.current) return;
    const vp = viewportRef.current;
    setZoom(z);
    setOffset(centerOffset(vp.clientWidth, vp.clientHeight, imageInfo.width, imageInfo.height, z));
  }, [imageInfo, viewportRef]);

  const onMouseDown = useCallback((e) => {
    const isPan = e.button === 1 || activeTool === 'hand';
    if (!isPan) return;
    e.preventDefault();
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const sx = e.clientX;
    const sy = e.clientY;
    const onMove = (ev) => setOffset({ x: ox + ev.clientX - sx, y: oy + ev.clientY - sy });
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [activeTool]);

  const cursor = activeTool === 'hand' ? 'grab' : 'crosshair';

  return {
    zoom,
    offset,
    activeTool,
    setActiveTool,
    cursor,
    fitToScreen,
    zoomTo100,
    zoomIn,
    zoomOut,
    zoomPreset,
    zoomToArea,
    handleZoomChange,
    onMouseDown,
  };
}
