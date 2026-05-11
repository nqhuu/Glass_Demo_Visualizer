import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { vi } from './locales/vi';

const defaultLocale = import.meta.env.VITE_DEFAULT_LOCALE === 'en' ? 'en' : 'vi';

try {
  // VI: Khoi tao i18n tu dau de moi chu hien thi sau nay deu dung key ngon ngu.
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: defaultLocale,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
  });
} catch (error) {
  // VI: Loi i18n khong duoc chua thong tin nhay cam, giup debug nhanh khi cau hinh sai.
  console.error({
    module: 'I18n',
    action: 'init',
    message: 'Failed to initialize translations',
    error,
  });
}

export default i18n;
