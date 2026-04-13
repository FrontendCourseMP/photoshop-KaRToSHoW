import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const language = localStorage.getItem('language') || 'en'
// Пеоеводы для английского и русского языков
const resources = {
  en: {
    translation: {
      menu: {
        file: 'File',
        view: 'View',
        settings: 'Settings',
        open: 'Open…',
        exportPng: 'Export as PNG',
        exportJpeg: 'Export as JPEG',
        exportGb7: 'Export as GB7',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out',
        fitScreen: 'Fit to Screen',
        actualSize: 'Actual Size',
        languageEnglish: 'English',
        languageRussian: 'Русский',
      },
      toolbar: {
        zoomOutTitle: 'Zoom out (−)',
        zoomInTitle: 'Zoom in (+)',
        zoomToolTitle: 'Zoom (Z)',
        handPanTitle: 'Hand / Pan (H)',
        fitTitle: 'Fit to screen (Ctrl+0)',
        actualTitle: 'Actual size (Ctrl+1)',
        fit: 'Fit',
        actual: '1:1',
      },
      info: {
        image: 'Image',
        width: 'Width',
        height: 'Height',
        depth: 'Depth',
        format: 'Format',
        pixels: 'Pixels',
        view: 'View',
        zoom: 'Zoom',
        tool: 'Tool',
        shortcuts: 'Shortcuts',
        scroll: 'Scroll',
        pan: 'Space+drag',
        zoomStep: 'Zoom step',
        fit: 'Fit',
        actual: '100%',
        hand: 'Hand',
        zoomTool: 'Zoom tool',
      },
      empty: {
        title: 'No image open',
        sub: 'Drag a file here or Ctrl+O',
        formats: 'PNG · JPEG · GB7',
        drop: 'Drop to open',
      },
      error: {
        cannotLoad: 'Cannot load image.',
        unsupported: 'Unsupported format. Use PNG, JPEG or GB7.',
        close: '✕',
      },
      status: {
        noFile: 'No file open',
      },
      toolPlaceholder: 'Coming soon',
    },
  },
  ru: {
    translation: {
      menu: {
        file: 'Файл',
        view: 'Вид',
        settings: 'Настройки',
        open: 'Открыть…',
        exportPng: 'Экспорт в PNG',
        exportJpeg: 'Экспорт в JPEG',
        exportGb7: 'Экспорт в GB7',
        zoomIn: 'Увеличить',
        zoomOut: 'Уменьшить',
        fitScreen: 'Подогнать по экрану',
        actualSize: 'Реальный размер',
        languageEnglish: 'English',
        languageRussian: 'Русский',
      },
      toolbar: {
        zoomOutTitle: 'Уменьшить (−)',
        zoomInTitle: 'Увеличить (+)',
        zoomToolTitle: 'Масштаб (Z)',
        handPanTitle: 'Рука / Перемещение (H)',
        fitTitle: 'Подогнать по экрану (Ctrl+0)',
        actualTitle: 'Реальный размер (Ctrl+1)',
        fit: 'Подогнать',
        actual: '1:1',
      },
      info: {
        image: 'Изображение',
        width: 'Ширина',
        height: 'Высота',
        depth: 'Глубина',
        format: 'Формат',
        pixels: 'Пикселей',
        view: 'Вид',
        zoom: 'Масштаб',
        tool: 'Инструмент',
        shortcuts: 'Сочетания',
        scroll: 'Прокрутка',
        pan: 'Пробел + перетаскивание',
        zoomStep: 'Шаг масштаба',
        fit: 'По экрану',
        actual: '100%',
        hand: 'Рука',
        zoomTool: 'Масштаб',
      },
      empty: {
        title: 'Изображение не открыто',
        sub: 'Перетащите файл сюда или Ctrl+O',
        formats: 'PNG · JPEG · GB7',
        drop: 'Отпустите, чтобы открыть',
      },
      error: {
        cannotLoad: 'Не удалось загрузить изображение.',
        unsupported: 'Неподдерживаемый формат. Используйте PNG, JPEG или GB7.',
        close: '✕',
      },
      status: {
        noFile: 'Файл не открыт',
      },
      toolPlaceholder: 'Скоро появится',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
