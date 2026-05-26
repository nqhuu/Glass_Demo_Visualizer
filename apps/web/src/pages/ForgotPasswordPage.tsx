import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../auth/auth-api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AuthInput, AuthShell } from './LoginPage';
import { logSafeUiError } from '../utils/safe-log';

// VI: Trang yeu cau reset mat khau, khong tiet lo email co ton tai hay khong.
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await forgotPasswordRequest(email);
      setMessage(t('auth.forgotPasswordSuccess'));
    } catch (error) {
      logSafeUiError('ForgotPasswordPage', 'handleSubmit', 'Forgot password request failed', error);
      setMessage(t('auth.forgotPasswordSuccess'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">{t('auth.forgotPasswordTitle')}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t('auth.forgotPasswordHelp')}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="space-y-4">
          <AuthInput id="email" label={t('auth.emailLabel')} type="email" autoComplete="email" value={email} onChange={setEmail} />
          {message ? <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p> : null}
          <button className="w-full rounded-md bg-brand-red px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.sendingReset') : t('auth.sendReset')}
          </button>
          <Link className="block text-center text-sm font-semibold text-neutral-800" to="/login">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
