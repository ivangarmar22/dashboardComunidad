import { useEffect, useState } from 'react';
import OverviewTab from './components/OverviewTab.jsx';
import SupplyView from './components/SupplyView.jsx';
import { SUPPLIES } from './data.js';
import { useTheme } from './theme.jsx';

const TABS = [
  { id: 'overview', label: 'Resumen', shortLabel: 'Resumen' },
  ...Object.values(SUPPLIES).map((s) => ({
    id: s.key,
    label: s.tab,
    shortLabel: s.shortTab,
    swatch: `var(--c-${s.key})`,
  })),
];

// La pestaña activa va en el hash (#portales) para poder enlazarla
function readHash() {
  const id = window.location.hash.slice(1);
  return TABS.some((t) => t.id === id) ? id : 'overview';
}

function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(readHash);

  useEffect(() => {
    const onNavigation = () => setActiveTab(readHash());
    window.addEventListener('popstate', onNavigation);
    return () => window.removeEventListener('popstate', onNavigation);
  }, []);

  const navigate = (id) => {
    const url = id === 'overview' ? window.location.pathname : `#${id}`;
    window.history.pushState(null, '', url);
    setActiveTab(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="34" height="34" />
          <div>
            <h1>Terrazas del Cañaveral</h1>
            <span className="brand-eyebrow">Comunidad · Luz y agua</span>
          </div>
        </div>

        <nav className="tabs" aria-label="Secciones">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="tab"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => navigate(tab.id)}
            >
              {tab.swatch && (
                <span
                  className="tab-swatch"
                  style={{ background: tab.swatch }}
                  aria-hidden="true"
                />
              )}
              <span className="tab-label">{tab.label}</span>
              <span className="tab-label-short">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="masthead-meta">
          <ThemeToggle />
        </div>
      </header>

      <main>
        {activeTab === 'overview' ? (
          <OverviewTab onNavigate={navigate} />
        ) : (
          <SupplyView key={activeTab} supply={SUPPLIES[activeTab]} />
        )}
      </main>
    </div>
  );
}

export default App;
