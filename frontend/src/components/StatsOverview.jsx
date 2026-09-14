import React from 'react';

export default function StatsOverview({ stats, selectedCategory, onSelectCategory }) {
  if (!stats) return null;

  const total = stats.total || 0;
  const active = stats.active || (stats.new + stats.notified + stats.in_progress) || 0;
  const confirmed = stats.confirmed_fixed || 0;
  const overdue = stats.closed_no_confirmation || 0;

  const categories = stats.categories || {};

  return (
    <div className="minimal-stats-bar">
      <div className="stats-pills-list">
        <div className="stat-mini-pill">
          <span className="mini-pill-label">Total:</span>
          <span className="mini-pill-val">{total}</span>
        </div>
        <div className="stat-mini-pill stat-mini-active">
          <span className="mini-pill-label">Open:</span>
          <span className="mini-pill-val">{active}</span>
        </div>
        <div className="stat-mini-pill stat-mini-resolved">
          <span className="mini-pill-label">Resolved:</span>
          <span className="mini-pill-val">{confirmed}</span>
        </div>
        {overdue > 0 && (
          <div className="stat-mini-pill stat-mini-overdue">
            <span className="mini-pill-label">Overdue:</span>
            <span className="mini-pill-val">{overdue}</span>
          </div>
        )}
      </div>

      {/* Subtle Category Chips */}
      {Object.keys(categories).length > 0 && (
        <div className="mini-categories-list">
          {Object.entries(categories).map(([cat, count]) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`mini-cat-chip ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCategory(isSelected ? null : cat)}
              >
                <span>{cat}</span>
                <span className="mini-cat-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
