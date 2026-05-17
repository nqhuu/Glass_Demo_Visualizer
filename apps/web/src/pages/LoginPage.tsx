import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// VI: Trang login co hien/an mat khau va lien ket den dang ky/quen mat khau.
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        message: 'Login request failed',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      setErrorMessage(t('auth.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">{t('auth.loginTitle')}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t('auth.loginHelp')}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="space-y-4">
          <AuthInput id="email" label={t('auth.emailLabel')} type="email" autoComplete="email" value={email} onChange={setEmail} />
          <PasswordInput
            id="password"
            label={t('auth.passwordLabel')}
            autoComplete="current-password"
            value={password}
            showPassword={showPassword}
            onChange={setPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link className="font-semibold text-brand-red" to="/forgot-password">
              {t('auth.forgotPasswordLink')}
            </Link>
            <Link className="font-semibold text-neutral-800" to="/register">
              {t('auth.registerLink')}
            </Link>
          </div>

          {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

          <button className="w-full rounded-md bg-brand-red px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-stone-50 text-brand-black">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-red">{t('auth.kicker')}</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal sm:text-5xl">{t('auth.title')}</h1>
            <p className="max-w-xl text-base leading-7 text-neutral-700">{t('auth.description')}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthInput({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-neutral-800" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="w-full rounded-md border border-neutral-300 px-3 py-3 text-base outline-none ring-brand-red focus:ring-2"
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}

export function PasswordInput({
  id,
  label,
  autoComplete,
  value,
  showPassword,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-neutral-800" htmlFor={id}>
        {label}
      </label>
      <div className="flex rounded-md border border-neutral-300 bg-white ring-brand-red focus-within:ring-2">
        <input
          autoComplete={autoComplete}
          className="min-w-0 flex-1 rounded-l-md px-3 py-3 text-base outline-none"
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button className="flex min-h-12 w-12 items-center justify-center rounded-r-md text-neutral-700" type="button" onClick={onToggle} aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}>
          {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}
