import { useState, useEffect } from 'react';

// Хук для переключения языка и сохранения выбора в localStorage
export default function useLanguage(i18n) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || i18n.resolvedLanguage || 'en');

  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  }, [language, i18n]);

  return [language, setLanguage];
}
