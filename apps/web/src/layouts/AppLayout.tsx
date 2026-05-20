import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/use-auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getVisibleNavItems } from './navigation';

// VI: Layout chinh sau dang nhap, gom desktop sidebar, tablet rail va mobile bottom nav.
export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const visibleNavItems = getVisibleNavItems(user?.role);
  const isEditorWorkspace =
    /^\/app\/projects\/[^/]+\/images\/[^/]+\/editor$/.test(location.pathname) ||
    /^\/app\/editor\/projects\/[^/]+\/images\/[^/]+$/.test(location.pathname);
  const activeItem =
    visibleNavItems.find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) ??
    visibleNavItems[0];

  const handleLogout = () => {
    try {
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      // VI: Logout chi xoa token local; log an toan neu navigation that bai.
      console.error({
        module: 'AppLayout',
        action: 'handleLogout',
        userId: user?.id,
        message: 'Failed to complete logout navigation',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (isEditorWorkspace) {
    // VI: Route editor can khong gian rong nhu mockup, van nam trong ProtectedRoute cua /app.
    return (
      <div className="min-h-screen bg-stone-50 text-brand-black">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-brand-black">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-neutral-200 bg-white px-4 py-5 lg:flex lg:flex-col">
        <BrandBlock />
        <nav className="mt-8 space-y-1" aria-label={t('navigation.primaryLabel')}>
          {visibleNavItems.map((item) => (
            <DesktopNavLink key={item.path} item={item} />
          ))}
        </nav>
        <div className="mt-auto rounded-md border border-neutral-200 bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('account.signedIn')}</p>
          <p className="mt-2 truncate text-sm font-semibold text-neutral-950">{user?.name}</p>
          <p className="truncate text-xs text-neutral-600">{user?.email}</p>
          <button className="mt-4 w-full rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white" type="button" onClick={handleLogout}>
            {t('auth.logout')}
          </button>
        </div>
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-neutral-200 bg-white px-2 py-5 md:flex md:flex-col lg:hidden">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <nav className="mt-8 space-y-2" aria-label={t('navigation.tabletLabel')}>
          {visibleNavItems.map((item) => (
            <TabletNavLink key={item.path} item={item} />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-20 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <div className="lg:hidden">
                <BrandMark />
              </div>
              <p className="hidden text-xs font-semibold uppercase tracking-wide text-brand-red sm:block">{t(activeItem.labelKey)}</p>
              <h1 className="truncate text-lg font-semibold text-neutral-950 sm:text-xl">{t(activeItem.descriptionKey)}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <div className="hidden rounded-md border border-neutral-200 px-3 py-2 text-right sm:block">
                <p className="max-w-36 truncate text-sm font-semibold text-neutral-950">{user?.name}</p>
                <p className="text-xs text-neutral-500">{t(`roles.${user?.role ?? 'user'}`)}</p>
              </div>
              <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" type="button" onClick={handleLogout}>
                {t('auth.logout')}
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-2 md:hidden">
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:hidden" aria-label={t('navigation.mobileLabel')}>
        <div className={`grid gap-1 ${visibleNavItems.length === 3 ? 'grid-cols-3' : visibleNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {visibleNavItems.map((item) => (
            <MobileNavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function BrandBlock() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div>
        <p className="text-sm font-semibold text-neutral-950">{t('brand.name')}</p>
        <p className="text-xs text-neutral-500">{t('brand.subtitle')}</p>
      </div>
    </div>
  );
}

function BrandMark() {
  const { t } = useTranslation();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-black text-sm font-bold text-white" aria-label={t('brand.logoLabel')}>
      {t('brand.initials')}
    </div>
  );
}

type VisibleNavItem = ReturnType<typeof getVisibleNavItems>[number];

function DesktopNavLink({ item }: { item: VisibleNavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        `flex items-start gap-3 rounded-md px-3 py-3 text-sm transition ${
          isActive ? 'bg-red-50 text-brand-red' : 'text-neutral-700 hover:bg-stone-100 hover:text-neutral-950'
        }`
      }
      to={item.path}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-current">
        <Icon aria-hidden="true" size={16} strokeWidth={2} />
      </span>
      <span>
        <span className="block font-semibold">{t(item.labelKey)}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{t(item.descriptionKey)}</span>
      </span>
    </NavLink>
  );
}

function TabletNavLink({ item }: { item: VisibleNavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center rounded-md px-1 py-2 text-xs font-semibold ${
          isActive ? 'bg-red-50 text-brand-red' : 'text-neutral-600 hover:bg-stone-100 hover:text-neutral-950'
        }`
      }
      title={t(item.labelKey)}
      to={item.path}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={2} />
      <span className="mt-1 max-w-full truncate">{t(item.shortLabelKey)}</span>
    </NavLink>
  );
}

function MobileNavLink({ item }: { item: VisibleNavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center rounded-md px-1 py-1 text-xs font-semibold ${
          isActive ? 'bg-red-50 text-brand-red' : 'text-neutral-600'
        }`
      }
      to={item.path}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2} />
      <span className="mt-1 truncate">{t(item.shortLabelKey)}</span>
    </NavLink>
  );
}
