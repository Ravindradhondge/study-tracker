import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Plus, LogOut, Sun, Moon, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const { user, sections, activeTab, setActiveTab, setShowManageSections, handleLogout, darkMode, toggleDarkMode, mobileMenuOpen, setMobileMenuOpen } = useApp();

  if (!user) return null;

  return (
    <>
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-brand">
          <div className="avatar-small">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <span>Study Tracker</span>
        </div>
        <button className="theme-toggle-mobile" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="user-profile">
          <div className="avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <div className="user-info">
            <h2>{user.name}</h2>
            <p>Student</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          {sections.map(section => (
            <button key={section.id} className={`nav-item ${activeTab === section.id ? 'active' : ''}`} onClick={() => { setActiveTab(section.id); setMobileMenuOpen(false); }}>
              <span className="section-icon">{section.icon}</span> {section.name}
            </button>
          ))}
          <button className="nav-item secondary" onClick={() => { setShowManageSections(true); setMobileMenuOpen(false); }}>
            <Plus size={18} /> Manage Sections
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
