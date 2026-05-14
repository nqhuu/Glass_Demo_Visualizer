import { useTranslation } from 'react-i18next';

// VI: Nut doi ngon ngu dung i18n key cho toan bo text hien thi.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const switchLanguage = async (language: 'en' | 'vi') => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      console.error({
        module: 'LanguageSwitcher',
        action: 'switchLanguage',
        language,
        message: 'Failed to change language',
        error,
      });
    }
  };

  return (
    <div className="flex gap-2">
      <button
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800"
        type="button"
        onClick={() => switchLanguage('vi')}
      >
        {t('common.languageVietnamese')}
      </button>
      <button
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800"
        type="button"
        onClick={() => switchLanguage('en')}
      >
        {t('common.languageEnglish')}
      </button>
    </div>
  );
}
