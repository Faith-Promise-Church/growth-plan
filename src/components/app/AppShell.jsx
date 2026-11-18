import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { currentPlanYear } from '../../lib/time.js';
import { isDemo } from '../../data/client.js';

function Icon({ name }) {
  const paths = {
    home: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z',
    assessment: 'M8 4h8v2h3v15H5V6h3zm0 2v1h8V6m-7 6h6m-6 4h4',
    plan: 'M5 5h14M5 12h14M5 19h9',
  };
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountMenu() {
  const { profile, user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Close the menu when the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || 'Account';
  const initial = (profile?.first_name || user?.email || '?').charAt(0).toUpperCase();

  async function logOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="account__button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="account__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="visually-hidden">Account menu</span>
      </button>
      {open ? (
        <div className="account__menu" id="account-menu">
          <p className="account__name">{name}</p>
          <Link to="/email/preferences" className="account__item">
            Email preferences
          </Link>
          <Link to="/assessment/history" className="account__item">
            Assessment history
          </Link>
          <Link to="/plans" className="account__item">
            Plan history
          </Link>
          {isAdmin ? (
            <Link to="/admin" className="account__item">
              Admin
            </Link>
          ) : null}
          <button type="button" className="account__item" onClick={logOut}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AppShell({ children }) {
  const year = currentPlanYear();
  const location = useLocation();
  const mainRef = useRef(null);

  // Move focus to the page on navigation, so screen readers and keyboards start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const tabs = [
    { to: '/home', label: 'Home', icon: 'home' },
    { to: '/assessment', label: 'Assessment', icon: 'assessment' },
    { to: `/plan/${year}`, label: 'Plan', icon: 'plan', match: '/plan' },
  ];

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="shell__header">
        <div className="shell__header-inner">
          <Link to="/home" className="shell__logo">
            <img src="/assets/logos/growth-plan-dark.png" alt="Growth Plan, home" width="143" height="25" />
          </Link>
          <span className="shell__year">{`${year} plan`}</span>
          <nav className="shell__topnav" aria-label="Main">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => `topnav__link${isActive || (t.match && location.pathname.startsWith(t.match)) ? ' is-active' : ''}`}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <AccountMenu />
        </div>
        {isDemo ? <div className="demo-ribbon">Demo mode. Nothing here is saved to the real database.</div> : null}
      </header>
      <main id="main" className="shell__main" ref={mainRef} tabIndex={-1}>
        {children ?? <Outlet />}
      </main>
      <nav className="tabbar" aria-label="Main">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `tabbar__link${isActive || (t.match && location.pathname.startsWith(t.match)) ? ' is-active' : ''}`}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
