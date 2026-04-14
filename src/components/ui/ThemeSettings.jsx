import { useState } from 'react';

export default function ThemeSettings({
  t,
  themeMode,
  accentColor,
  language,
  onClose,
  onThemeModeChange,
  onAccentColorChange,
  onLanguageChange,
}) {
  const [themeTab, setThemeTab] = useState('theme');

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-modal__header">
          <h3>{t('menu.themeSettings')}</h3>
          <button className="theme-modal__close" onClick={onClose}>{t('menu.close')}</button>
        </div>

        <div className="theme-modal__content">
          <nav className="theme-modal__nav">
            <button
              className={`theme-modal__nav-item${themeTab === 'theme' ? ' theme-modal__nav-item--active' : ''}`}
              onClick={() => setThemeTab('theme')}
            >
              {t('menu.theme')}
            </button>
            <button
              className={`theme-modal__nav-item${themeTab === 'accent' ? ' theme-modal__nav-item--active' : ''}`}
              onClick={() => setThemeTab('accent')}
            >
              {t('menu.accentColor')}
            </button>
            <button
              className={`theme-modal__nav-item${themeTab === 'language' ? ' theme-modal__nav-item--active' : ''}`}
              onClick={() => setThemeTab('language')}
            >
              {t('menu.language')}
            </button>
          </nav>

          <section className="theme-modal__panel">
            {themeTab === 'theme' && (
              <>
                <p className="theme-modal__subtitle">{t('menu.themeSettingsSubtitle')}</p>
                <div className="theme-modal__section">
                  <div className="theme-modal__label">{t('menu.theme')}</div>
                  <div className="theme-modal__radios">
                    <button
                      className={`theme-modal__radio${themeMode === 'light' ? ' theme-modal__radio--active' : ''}`}
                      onClick={() => onThemeModeChange('light')}
                    >
                      {t('menu.themeLight')}
                    </button>
                    <button
                      className={`theme-modal__radio${themeMode === 'dark' ? ' theme-modal__radio--active' : ''}`}
                      onClick={() => onThemeModeChange('dark')}
                    >
                      {t('menu.themeDark')}
                    </button>
                  </div>
                </div>
              </>
            )}

            {themeTab === 'accent' && (
              <>
                <p className="theme-modal__subtitle">{t('menu.chooseAccent')}</p>
                <div className="theme-modal__section">
                  <div className="theme-modal__label">{t('menu.accentColor')}</div>
                  <input
                    className="theme-modal__picker"
                    type="color"
                    value={accentColor}
                    onChange={(e) => onAccentColorChange(e.target.value)}
                  />
                </div>

              </>
            )}

            {themeTab === 'language' && (
              <>
                <p className="theme-modal__subtitle">{t('menu.chooseLanguage')}</p>
                <div className="theme-modal__section">
                  <div className="theme-modal__label">{t('menu.language')}</div>
                  <div className="theme-modal__radios">
                    <button
                      className={`theme-modal__radio${language === 'en' ? ' theme-modal__radio--active' : ''}`}
                      onClick={() => onLanguageChange('en')}
                    >
                      {t('menu.languageEnglish')}
                    </button>
                    <button
                      className={`theme-modal__radio${language === 'ru' ? ' theme-modal__radio--active' : ''}`}
                      onClick={() => onLanguageChange('ru')}
                    >
                      {t('menu.languageRussian')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
