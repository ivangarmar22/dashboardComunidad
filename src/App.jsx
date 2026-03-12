import React, { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import OverviewTab from './components/OverviewTab.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'General' },
    { id: 'comunes', label: 'Zonas Comunes' },
    { id: 'portales', label: 'Portales (1-7)' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard Comunidad</h1>
        <nav className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`header-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
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
