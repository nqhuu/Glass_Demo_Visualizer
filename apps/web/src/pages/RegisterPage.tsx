import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AuthInput, AuthShell, PasswordInput } from './LoginPage';

// VI: Trang dang ky cong khai, backend luon tao role user co ban.
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, status } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatch'));
      return;
    }

    try {
      setIsSubmitting(true);
      await register(name, email, password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error({
        module: 'RegisterPage',
        action: 'handleSubmit',
        message: 'Registration request failed',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      setErrorMessage(t('auth.registerFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">{t('auth.registerTitle')}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t('auth.registerHelp')}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="space-y-4">
          <AuthInput id="name" label={t('auth.nameLabel')} type="text" autoComplete="name" value={name} onChange={setName} />
          <AuthInput id="email" label={t('auth.emailLabel')} type="email" autoComplete="email" value={email} onChange={setEmail} />
          <PasswordInput id="password" label={t('auth.passwordLabel')} autoComplete="new-password" value={password} showPassword={showPassword} onChange={setPassword} onToggle={() => setShowPassword((current) => !current)} />
          <PasswordInput id="confirmPassword" label={t('auth.confirmPasswordLabel')} autoComplete="new-password" value={confirmPassword} showPassword={showPassword} onChange={setConfirmPassword} onToggle={() => setShowPassword((current) => !current)} />
          <p className="text-sm text-neutral-600">{t('auth.passwordRule')}</p>
          {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}
          <button className="w-full rounded-md bg-brand-red px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.registering') : t('auth.registerSubmit')}
          </button>
          <Link className="block text-center text-sm font-semibold text-neutral-800" to="/login">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
