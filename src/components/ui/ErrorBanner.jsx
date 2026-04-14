// Отображает сообщение об ошибке и кнопку закрытия
export default function ErrorBanner({ t, error, onClose }) {
  if (!error) return null;

  return (
    <div className="error-banner">
      <div className="error-banner__content">
        <span className="error-banner__icon" aria-hidden="true">⚠</span>
        <span>{error}</span>
      </div>
      <button className="error-banner__close" onClick={onClose}>{t('error.close')}</button>
    </div>
  );
}
