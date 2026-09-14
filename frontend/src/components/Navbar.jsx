import React from 'react';
import { Mail, RefreshCw, Sparkles, LogOut, UserCheck } from 'lucide-react';

export default function Navbar({
  isOnline,
  isPolling,
  onPollNow,
  isSeeding,
  onSeedData,
  onRefresh,
  autoRefresh,
  setAutoRefresh,
  lastUpdated,
  currentUser,
  onLogout,
}) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <Mail size={24} />
        </div>
        <div>
          <div className="brand-title">
            Resident Issue Ticketing
            <span className="brand-badge">AI Dispatch Hub</span>
          </div>
          <div className="brand-subtitle">
            Automated Gmail Ingestion • Gemini Issue Classification • 24h SLA Tracking
          </div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Backend health status */}
        <div className="status-pill" title={isOnline ? "FastAPI service connected" : "Backend unreachable"}>
          <span className={`status-indicator-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
          <span>{isOnline ? 'API Connected' : 'Offline'}</span>
        </div>

        {/* Auto Refresh Toggle */}
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setAutoRefresh(!autoRefresh)}
          title="Toggle 8-second automatic polling"
          style={{ opacity: autoRefresh ? 1 : 0.6 }}
        >
          <RefreshCw size={14} className={autoRefresh ? 'spin' : ''} />
          Auto-Sync: {autoRefresh ? 'ON' : 'OFF'}
        </button>

        {/* Seed Sample Demo Data */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onSeedData}
          disabled={isSeeding || !isOnline}
          title="Seed realistic resident email conversations (Plumbing, Electrical, HVAC, Security)"
        >
          <Sparkles size={14} className={isSeeding ? 'spin' : ''} style={{ color: '#fbbf24' }} />
          {isSeeding ? 'Seeding...' : 'Load Demo Data'}
        </button>

        {/* Manual Poll Now button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onPollNow}
          disabled={isPolling || !isOnline}
          title="Fetch unseen emails from Gmail immediately"
        >
          <RefreshCw size={14} className={isPolling ? 'spin' : ''} />
          {isPolling ? 'Polling Gmail...' : 'Poll Mailbox Now'}
        </button>

        {/* Current Authenticated User & Logout */}
        {currentUser && (
          <div className="nav-user-profile">
            <div className="nav-user-badge" title={`${currentUser.name} (${currentUser.email || ''})`}>
              <div className="nav-user-avatar">
                {currentUser.avatar || <UserCheck size={14} />}
              </div>
              <div className="nav-user-meta">
                <span className="nav-user-name">{currentUser.name}</span>
                <span className="nav-user-role">{currentUser.role}</span>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm nav-logout-btn"
              onClick={onLogout}
              title="Sign out of Dispatch Hub"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
