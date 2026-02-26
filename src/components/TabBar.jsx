import React, { useRef, useEffect, useState } from 'react';

const tabs = [
  { id: 'home', icon: 'fas fa-home', label: 'ដើម' },
  { id: 'collection', icon: 'fas fa-bookmark', label: 'បញ្ជី' },
  { id: 'profile', icon: 'fas fa-user', label: 'ខ្ញុំ' },
];

export default function TabBar({ activeTab, onTabChange }) {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    const tabEl = tabsRef.current[activeIndex];
    if (tabEl) {
      const rect = tabEl.getBoundingClientRect();
      const parentRect = tabEl.parentElement.getBoundingClientRect();
      setIndicatorStyle({
        left: rect.left - parentRect.left + rect.width / 2 - 12,
        opacity: 1,
      });
    }
  }, [activeTab]);

  return (
    <div className="tabbar">
      {/* Active indicator glow */}
      <div className="tab-indicator" style={{
        transform: `translateX(${indicatorStyle.left || 0}px)`,
        opacity: indicatorStyle.opacity || 0,
      }}></div>

      {tabs.map((tab, i) => (
        <div
          className="tab"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          ref={el => tabsRef.current[i] = el}
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
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
          box-shadow: 0 2px 12px rgba(167,139,250,0.5);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
