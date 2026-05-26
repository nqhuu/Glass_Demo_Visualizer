import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../auth/auth-api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AuthShell, PasswordInput } from './LoginPage';
import { logSafeUiError } from '../utils/safe-log';

// VI: Trang dat lai mat khau bang token tu URL, token khong duoc log ra console.
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(token ? null : 'missing');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage(t('auth.resetTokenMissing'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatch'));
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPasswordRequest(token, password);
      navigate('/login', { replace: true });
    } catch (error) {
      logSafeUiError('ResetPasswordPage', 'handleSubmit', 'Reset password request failed', error);
      setErrorMessage(t('auth.resetPasswordFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">{t('auth.resetPasswordTitle')}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t('auth.resetPasswordHelp')}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="space-y-4">
          <PasswordInput id="password" label={t('auth.newPasswordLabel')} autoComplete="new-password" value={password} showPassword={showPassword} onChange={setPassword} onToggle={() => setShowPassword((current) => !current)} />
          <PasswordInput id="confirmPassword" label={t('auth.confirmPasswordLabel')} autoComplete="new-password" value={confirmPassword} showPassword={showPassword} onChange={setConfirmPassword} onToggle={() => setShowPassword((current) => !current)} />
          <p className="text-sm text-neutral-600">{t('auth.passwordRule')}</p>
          {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage === 'missing' ? t('auth.resetTokenMissing') : errorMessage}</p> : null}
          <button className="w-full rounded-md bg-brand-red px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? t('auth.resettingPassword') : t('auth.resetPasswordSubmit')}
          </button>
          <Link className="block text-center text-sm font-semibold text-neutral-800" to="/login">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
