import React, { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import OverviewTab from './components/OverviewTab.jsx';

const tabIcons = {
  overview: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  comunes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="11" y2="6" /><line x1="13" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="11" y2="10" /><line x1="13" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="11" y2="14" /><line x1="13" y1="14" x2="15" y2="14" /><rect x="10" y="18" width="4" height="4" />
    </svg>
  ),
  portales: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
};

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'General' },
    { id: 'comunes', label: 'Zonas Comunes' },
    { id: 'portales', label: 'Portales' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <img src="/logo.png" alt="Logo" className="header-logo" />
          <h1>Dashboard Comunidad</h1>
        </div>
        <nav className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`header-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tabIcons[tab.id]}
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      {activeTab === 'overview'
        ? <OverviewTab />
        : <Dashboard activeContract={activeTab} />
      }
    </div>
  );
}

export default App;
