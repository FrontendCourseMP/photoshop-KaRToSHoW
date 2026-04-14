import { useRef } from 'react';
import Menu from '../ui/Menu';
import { ZOOM_PRESETS } from '../../utils/zoom';

// Компонент верхнего меню, который строит пункты из конфигурации
export default function MenuBar({ menuConfig, fileInputRef }) {
  const localFileInputRef = useRef(null);
  const fileRef = fileInputRef ?? localFileInputRef;
  const { fileLabel, viewLabel, settingsLabel, fileAccept, file, view, settings, actions } = menuConfig;

  // Сопоставляет ключ действия с переданной функцией или обработчиком
  const resolveAction = (item) => {
    if (item.action) return item.action;
    if (item.actionKey === 'browse') return () => fileRef.current?.click();
    return actions?.[item.actionKey] ?? null;
  };

  const resolveItem = (item) => {
    if (item === '---') return item;
    return {
      ...item,
      action: item.children ? undefined : resolveAction(item),
      children: item.children?.map(child => ({ ...child, action: resolveAction(child) })),
    };
  };

  const resolvedFileItems = file.map(resolveItem);
  const resolvedViewItems = view.map(resolveItem);
  const resolvedSettingsItems = settings.map(resolveItem);
  const settingsAction = resolvedSettingsItems.length === 1 && !resolvedSettingsItems[0].children
    ? resolvedSettingsItems[0].action
    : null;

  return (
    <div className="menubar">
      <span className="menubar__brand">
        <span className="menubar__logo-mark" aria-hidden="true">P</span>
        <span className="menubar__logo-text">PhotoShopp</span>
      </span>
      <Menu label={fileLabel} items={resolvedFileItems} />
      <Menu label={viewLabel} items={resolvedViewItems} />
      <span className="menubar__ghost">Image</span>
      <span className="menubar__ghost">Filter</span>
      {settingsAction ? (
        <button className="menu__trigger" type="button" onClick={settingsAction}>
          {settingsLabel}
        </button>
      ) : (
        <Menu label={settingsLabel} items={resolvedSettingsItems} />
      )}
      <span className="menubar__ghost">Help</span>
      <input
        ref={fileRef}
        type="file"
        accept={fileAccept}
        style={{ display: 'none' }}
        onChange={e => actions?.onOpenFile?.(e.target.files[0])}
      />
    </div>
  );
}
