import React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Zap,
  Flame,
  Tv,
  Shield,
  Home,
  Tag
} from 'lucide-react';

const CATEGORY_ICONS = {
  plumbing: <Wrench size={14} />,
  electrical: <Zap size={14} />,
  hvac: <Flame size={14} />,
  appliance: <Tv size={14} />,
  security: <Shield size={14} />,
  structural: <Home size={14} />,
  other: <Tag size={14} />,
};

export default function StatsOverview({ stats, selectedCategory, onSelectCategory }) {
  if (!stats) return null;

  const total = stats.total || 0;
  const active = stats.active || (stats.new + stats.notified + stats.in_progress) || 0;
  const confirmed = stats.confirmed_fixed || 0;
  const overdue = stats.closed_no_confirmation || 0;

  const resolutionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const categories = stats.categories || {};

  return (
    <div>
      {/* 4 Primary KPI Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-info">
            <span className="stat-label">Total Tickets</span>
            <span className="stat-value">{total}</span>
            <span className="stat-subtext">Ingested resident emails</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-total">
            <Inbox size={24} />
          </div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-info">
            <span className="stat-label">Active / In Progress</span>
            <span className="stat-value">{active}</span>
            <span className="stat-subtext">Pending contractor resolution</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-active">
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card stat-confirmed">
          <div className="stat-info">
            <span className="stat-label">Confirmed Fixed</span>
            <span className="stat-value">{confirmed}</span>
            <span className="stat-subtext">{resolutionRate}% resolution success</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-confirmed">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-info">
            <span className="stat-label">Overdue / Expired</span>
            <span className="stat-value">{overdue}</span>
            <span className="stat-subtext">Exceeded 24h SLA window</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-warning">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {Object.keys(categories).length > 0 && (
        <div className="category-strip">
          <div className="category-strip-header">
            <span className="category-strip-title">
              <Tag size={16} /> Category Routing Breakdown
            </span>
            {selectedCategory && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onSelectCategory(null)}
                style={{ fontSize: '0.725rem', padding: '3px 8px' }}
              >
                Clear Category Filter
              </button>
            )}
          </div>
          <div className="category-pills-container">
            {Object.entries(categories).map(([cat, count]) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  className={`category-metric-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCategory(isSelected ? null : cat)}
                  style={{
                    borderLeft: `4px solid var(--cat-${cat}, #64748b)`,
                    background: isSelected ? 'rgba(99, 102, 241, 0.28)' : undefined
                  }}
                >
                  <span style={{ color: `var(--cat-${cat}, #94a3b8)`, display: 'flex', alignItems: 'center' }}>
                    {CATEGORY_ICONS[cat] || <Tag size={15} />}
                  </span>
                  <span className="category-name" style={{ textTransform: 'capitalize', color: '#f8fafc', fontWeight: 600 }}>
                    {cat.replace('_', ' ')}
                  </span>
                  <span className="category-count-badge">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
