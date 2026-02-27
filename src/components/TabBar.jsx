import React from 'react';

const tabs = [
  { id: 'home', icon: 'fas fa-home', label: 'ដើម' },
  { id: 'collection', icon: 'fas fa-bookmark', label: 'បញ្ជី' },
  { id: 'profile', icon: 'fas fa-user', label: 'ខ្ញុំ' },
];

export default function TabBar({ activeTab, onTabChange }) {
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="tabbar">
      {/* Active indicator — use CSS calc based on index */}
      <div
        className="tab-indicator"
        style={{
          left: `calc(${activeIndex * 33.333}% + 16.666% - 12px)`,
        }}
      ></div>

      {tabs.map((tab) => (
        <div
          className="tab"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          <div className={`tab-ic ${activeTab === tab.id ? 'active' : ''}`}>
            <i className={tab.icon}></i>
          </div>
          <div className={`tab-lbl ${activeTab === tab.id ? 'active' : ''}`}>
            {tab.label}
          </div>
        </div>
      ))}

      <style>{`
        .tab-indicator {
          position: absolute;
          top: 0;
          width: 24px; height: 3px;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
          border-radius: 0 0 4px 4px;
          transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 12px rgba(167,139,250,0.5);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
