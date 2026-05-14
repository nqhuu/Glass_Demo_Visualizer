import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// VI: Trang login Sprint 1 gui email/password va luu JWT sau khi backend xac thuc.
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error({
        module: 'LoginPage',
        action: 'handleSubmit',
        email,
        message: 'Login request failed',
        error,
      });
      setErrorMessage(t('auth.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-brand-black">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{t('auth.kicker')}</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal sm:text-5xl">{t('auth.title')}</h1>
            <p className="max-w-xl text-base leading-7 text-neutral-700">{t('auth.description')}</p>
            <LanguageSwitcher />
          </div>

          <form className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-800" htmlFor="email">
                  {t('auth.emailLabel')}
                </label>
                <input
                  autoComplete="email"
                  className="w-full rounded-md border border-neutral-300 px-3 py-3 text-base outline-none ring-brand-red focus:ring-2"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-800" htmlFor="password">
                  {t('auth.passwordLabel')}
                </label>
                <input
                  autoComplete="current-password"
                  className="w-full rounded-md border border-neutral-300 px-3 py-3 text-base outline-none ring-brand-red focus:ring-2"
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
              ) : null}

              <button
                className="w-full rounded-md bg-brand-red px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
