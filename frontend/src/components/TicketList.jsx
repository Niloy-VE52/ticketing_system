import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  Home,
  Clock,
  AlertCircle,
  Wrench,
  Zap,
  Flame,
  Tv,
  Shield,
  Tag,
  Mail,
  ArrowUpDown
} from 'lucide-react';

const CATEGORY_ICONS = {
  plumbing: <Wrench size={13} />,
  electrical: <Zap size={13} />,
  hvac: <Flame size={13} />,
  appliance: <Tv size={13} />,
  security: <Shield size={13} />,
  structural: <Home size={13} />,
  other: <Tag size={13} />,
};

export default function TicketList({
  tickets,
  selectedCategory,
  onSelectCategory,
  onOpenTranscript,
  onConfirmFix,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Compute remaining SLA time
  const getSlaInfo = (ticket) => {
    if (ticket.status === 'confirmed_fixed') {
      return { text: 'Resolved', class: 'sla-active', icon: <CheckCircle size={12} /> };
    }
    if (ticket.status === 'closed_no_confirmation') {
      return { text: 'SLA Expired (>24h)', class: 'sla-overdue', icon: <AlertCircle size={12} /> };
    }

    if (!ticket.created_at) return { text: '24h SLA', class: 'sla-active', icon: <Clock size={12} /> };

    const created = new Date(ticket.created_at).getTime();
    const now = Date.now();
    const diffHours = (now - created) / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return { text: 'SLA Overdue', class: 'sla-overdue', icon: <AlertCircle size={12} /> };
    }

    const remainingHours = Math.floor(24 - diffHours);
    const remainingMins = Math.floor((24 - diffHours - remainingHours) * 60);

    if (remainingHours < 4) {
      return {
        text: `${remainingHours}h ${remainingMins}m remaining`,
        class: 'sla-warning',
        icon: <Clock size={12} />
      };
    }

    return {
      text: `${remainingHours}h ${remainingMins}m remaining`,
      class: 'sla-active',
      icon: <Clock size={12} />
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter & Search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSubject = (t.subject || '').toLowerCase().includes(term);
        const matchesSender = (t.resident_email || '').toLowerCase().includes(term);
        const matchesBody = (t.body || '').toLowerCase().includes(term);
        const matchesHome = (t.home || '').toLowerCase().includes(term);
        if (!matchesSubject && !matchesSender && !matchesBody && !matchesHome) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (!['new', 'notified', 'in_progress'].includes(t.status)) return false;
        } else if (statusFilter === 'closed_all') {
          if (!['confirmed_fixed', 'closed', 'closed_no_confirmation'].includes(t.status)) return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // Category
      if (selectedCategory && t.category !== selectedCategory) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [tickets, searchTerm, statusFilter, selectedCategory, sortOrder]);

  const counts = useMemo(() => {
    return {
      all: tickets.length,
      active: tickets.filter((t) => ['new', 'notified', 'in_progress'].includes(t.status)).length,
      confirmed: tickets.filter((t) => t.status === 'confirmed_fixed').length,
      closed_all: tickets.filter((t) => ['confirmed_fixed', 'closed', 'closed_no_confirmation'].includes(t.status)).length,
    };
  }, [tickets]);

  return (
    <section className="main-content-layout">
      {/* Controls Bar: Tabs, Search, Filters */}
      <div className="ticket-controls-bar">
        {/* Status Tabs */}
        <div className="filter-tabs">
          <button
            className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Tickets <span className="tab-count">{counts.all}</span>
          </button>
          <button
            className={`tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active Issues <span className="tab-count">{counts.active}</span>
          </button>
          <button
            className={`tab-btn ${statusFilter === 'confirmed_fixed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('confirmed_fixed')}
          >
            Confirmed Fixed <span className="tab-count">{counts.confirmed}</span>
          </button>
          <button
            className={`tab-btn ${statusFilter === 'closed_all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('closed_all')}
          >
            Closed / Archive <span className="tab-count">{counts.closed_all}</span>
          </button>
        </div>

        {/* Search and Dropdowns */}
        <div className="search-filters-group">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search subject, resident, unit, email content..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Dropdown */}
          <select
            className="select-filter"
            value={selectedCategory || ''}
            onChange={(e) => onSelectCategory(e.target.value || null)}
          >
            <option value="">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="appliance">Appliance</option>
            <option value="security">Security & Access</option>
            <option value="structural">Structural</option>
            <option value="other">Other / General</option>
          </select>

          {/* Sort order toggle */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            title={`Sort: ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
          >
            <ArrowUpDown size={16} />
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon-circle">
            <Mail size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No tickets match your filters</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 460 }}>
            Try clearing your search or category filter, or click "Load Demo Data" or "Poll Mailbox Now" above.
          </p>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((ticket) => {
            const sla = getSlaInfo(ticket);
            const senderInitial = (ticket.resident_email || 'R')[0].toUpperCase();

            return (
              <div key={ticket.id} className="ticket-card">
                {/* Header Row */}
                <div className="ticket-card-header">
                  <div className="ticket-meta-left">
                    <span className="ticket-id-tag">#{ticket.id}</span>

                    {/* Unit identifier */}
                    {ticket.home ? (
                      <span className="unit-badge">
                        <Home size={12} /> {ticket.home}
                      </span>
                    ) : (
                      <span className="unit-badge unit-badge-none">Unit unstated</span>
                    )}

                    {/* Category badge */}
                    <span className={`category-badge ${ticket.category || 'other'}`}>
                      {CATEGORY_ICONS[ticket.category] || <Tag size={12} />}
                      {ticket.category || 'other'}
                    </span>

                    {/* 24h SLA Badge */}
                    <span className={`sla-badge ${sla.class}`}>
                      {sla.icon} {sla.text}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span className={`status-badge ${ticket.status}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Ticket Subject & Body Preview */}
                <div>
                  <h3
                    className="ticket-title"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onOpenTranscript(ticket)}
                  >
                    {ticket.subject || '(No subject provided)'}
                  </h3>
                  <p className="ticket-body-snippet">
                    {ticket.body || 'No message content available.'}
                  </p>
                </div>

                {/* Footer Row */}
                <div className="ticket-card-footer">
                  <div className="resident-info-group">
                    <div className="resident-avatar">{senderInitial}</div>
                    <div className="resident-details">
                      <span className="resident-email-text">{ticket.resident_email}</span>
                      <span className="ticket-date-text">
                        Received {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="ticket-actions-group">
                    {ticket.assigned_team && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'JetBrains Mono',
                          marginRight: '6px'
                        }}
                      >
                        &rarr; {ticket.assigned_team.split('@')[0]}
                      </span>
                    )}

                    {/* Quick Confirm Fix button */}
                    {ticket.status !== 'confirmed_fixed' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
                        onClick={() => onConfirmFix(ticket.id)}
                        title="Mark maintenance resolved"
                      >
                        <CheckCircle size={14} />
                        Confirm Fix
                      </button>
                    )}

                    {/* Open Transcript Button */}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenTranscript(ticket)}
                    >
                      <Eye size={14} />
                      View Transcript
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
