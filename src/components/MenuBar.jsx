import { useRef } from 'react';
import Menu from './Menu';
import { ZOOM_PRESETS } from '../utils/zoom';

// Компонент верхнего меню, который строит пункты из конфигурации
export default function MenuBar({ menuConfig }) {
  const fileInputRef = useRef(null);
  const { fileLabel, viewLabel, settingsLabel, fileAccept, file, view, settings, actions } = menuConfig;

  // Сопоставляет ключ действия с переданной функцией или обработчиком
  const resolveAction = (item) => {
    if (item.action) return item.action;
    if (item.actionKey === 'browse') return () => fileInputRef.current?.click();
    return actions?.[item.actionKey] ?? null;
  };

  const resolvedFileItems = file.map((item) =>
    item === '---' ? item : { ...item, action: resolveAction(item) }
  );

  const resolvedViewItems = view.map((item) =>
    item === '---' ? item : { ...item, action: resolveAction(item) }
  );

  const resolvedSettingsItems = settings.map((item) =>
    item === '---' ? item : { ...item, action: resolveAction(item) }
  );

  return (
    <div className="menubar">
      <span className="menubar__brand">
        <span className="menubar__logo-mark" aria-hidden="true">P</span>
        <span className="menubar__logo-text">PhotoShopp</span>
      </span>
      <Menu label={fileLabel} items={resolvedFileItems} />
      <Menu label={viewLabel} items={resolvedViewItems} />
      <Menu label={settingsLabel} items={resolvedSettingsItems} />
      <span className="menubar__ghost">Image</span>
      <span className="menubar__ghost">Filter</span>
      <span className="menubar__ghost">Help</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        style={{ display: 'none' }}
        onChange={e => actions?.onOpenFile?.(e.target.files[0])}
      />
    </div>
  );
}
