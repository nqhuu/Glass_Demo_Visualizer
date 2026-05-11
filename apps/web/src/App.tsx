import { useTranslation } from 'react-i18next';

// VI: App shell toi thieu cho Sprint 0, chi xac nhan nen React/Tailwind/i18n da san sang.
export default function App() {
  const { t, i18n } = useTranslation();

  const switchLanguage = async (language: 'en' | 'vi') => {
    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      // VI: Khong hien loi ky thuat ra UI, chi ghi log an toan khi doi ngon ngu that bai.
      console.error({
        module: 'WebApp',
        action: 'switchLanguage',
        message: 'Failed to change language',
        language,
        error,
      });
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-brand-black">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="border-l-4 border-brand-red bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{t('app.kicker')}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">{t('app.title')}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700">{t('app.description')}</p>
          <div className="mt-6 flex gap-3">
            <button
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white"
              type="button"
              onClick={() => switchLanguage('vi')}
            >
              Tiếng Việt
            </button>
            <button
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
              type="button"
              onClick={() => switchLanguage('en')}
            >
              English
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
