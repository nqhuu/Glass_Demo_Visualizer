import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { logSafeUiError } from '../utils/safe-log';

// VI: Nut doi ngon ngu gon VI/EN dung chung cho login va app shell.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const switchLanguage = async (language: 'en' | 'vi') => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      logSafeUiError('LanguageSwitcher', 'switchLanguage', 'Failed to change language', error, { language });
    }
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white p-1" aria-label={t('common.languageSwitchLabel')}>
      <Languages aria-hidden="true" className="ml-1 text-neutral-500" size={16} />
      <button
        className={`rounded px-2 py-1 text-xs font-semibold ${i18n.language === 'vi' ? 'bg-brand-red text-white' : 'text-neutral-700'}`}
        type="button"
        onClick={() => switchLanguage('vi')}
      >
        {t('common.languageVietnameseShort')}
      </button>
      <button
        className={`rounded px-2 py-1 text-xs font-semibold ${i18n.language === 'en' ? 'bg-brand-red text-white' : 'text-neutral-700'}`}
        type="button"
        onClick={() => switchLanguage('en')}
      >
        {t('common.languageEnglishShort')}
      </button>
    </div>
  );
}
