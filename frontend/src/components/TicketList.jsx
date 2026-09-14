import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

export function getOwnerName(ticket) {
  if (!ticket?.resident_email) return 'Resident';
  const prefix = ticket.resident_email.split('@')[0] || '';
  const clean = prefix.replace(/[._-]/g, ' ').replace(/\d+/g, '').trim();
  if (clean.length > 1) {
    return clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return ticket.resident_email;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
}

export default function TicketList({
  tickets = [],
  selectedCategory,
  onSelectCategory,
  onOpenTranscript,
  seenTicketIds = new Set(),
  onMarkSeen,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(10);

  // Toggle issue full text in table
  const toggleExpandIssue = (e, ticketId) => {
    e.stopPropagation();
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const handleRowClick = (ticket) => {
    if (onMarkSeen) onMarkSeen(ticket.id);
    onOpenTranscript(ticket);
  };

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        ticket.id?.toString().includes(search) ||
        ticket.resident_email?.toLowerCase().includes(search) ||
        ticket.home?.toLowerCase().includes(search) ||
        ticket.subject?.toLowerCase().includes(search) ||
        ticket.category?.toLowerCase().includes(search);

      // Status
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'closed' && (ticket.status === 'closed' || ticket.status === 'confirmed_fixed' || ticket.status === 'closed_no_confirmation')) ||
        (statusFilter === 'open' && ticket.status !== 'closed' && ticket.status !== 'confirmed_fixed' && ticket.status !== 'closed_no_confirmation') ||
        ticket.status === statusFilter;

      // Category
      const matchCategory = !selectedCategory || ticket.category === selectedCategory;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, searchTerm, statusFilter, selectedCategory]);

  const visibleTickets = filteredTickets.slice(0, visibleCount);

  return (
    <div className="table-dashboard-container">
      {/* Search & Minimal Filter Controls */}
      <div className="table-controls">
        <div className="table-search-box">
          <Search size={15} className="table-search-icon" />
          <input
            type="text"
            className="table-search-input"
            placeholder="Search tickets by ID, email, house, or issue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-filter-group">
          <select
            className="table-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Active / Open</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed / Resolved</option>
          </select>

          {selectedCategory && (
            <button
              className="table-clear-cat-btn"
              onClick={() => onSelectCategory(null)}
              title="Clear category filter"
            >
              Filter: {selectedCategory} ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Minimalist Tickets Table */}
      <div className="table-responsive-wrapper">
        <table className="minimal-ticket-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Ticket id</th>
              <th style={{ minWidth: '180px' }}>email</th>
              <th style={{ minWidth: '120px' }}>House details</th>
              <th style={{ minWidth: '220px' }}>issue</th>
              <th style={{ minWidth: '120px' }}>Department</th>
              <th style={{ minWidth: '130px' }}>Issue date</th>
              <th style={{ minWidth: '100px' }}>status</th>
              <th style={{ minWidth: '130px' }}>Ticket status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleTickets.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty-cell">
                  No tickets found matching your filter criteria.
                </td>
              </tr>
            ) : (
              visibleTickets.map((ticket) => {
                const isSeen = seenTicketIds.has(ticket.id);
                const isExpanded = expandedIssueIds.has(ticket.id);
                const isClosed =
                  ticket.status === 'closed' ||
                  ticket.status === 'confirmed_fixed' ||
                  ticket.status === 'closed_no_confirmation';

                return (
                  <tr
                    key={ticket.id}
                    className={`table-row-item ${!isSeen ? 'row-unseen' : ''}`}
                    onClick={() => handleRowClick(ticket)}
                  >
                    {/* Ticket ID */}
                    <td className="cell-id">
                      <span className="id-badge">#{ticket.id}</span>
                    </td>

                    {/* Email */}
                    <td className="cell-email" title={ticket.resident_email}>
                      <div className="email-text">{ticket.resident_email}</div>
                      <div className="owner-subtext">{getOwnerName(ticket)}</div>
                    </td>

                    {/* House Details */}
                    <td className="cell-house">
                      <span className="house-badge">{ticket.home || 'General'}</span>
                    </td>

                    {/* Issue */}
                    <td className="cell-issue">
                      <div className="issue-subject">
                        {ticket.subject || 'Resident Inquiry'}
                      </div>
                      {ticket.body && (
                        <div className="issue-body-preview">
                          {isExpanded
                            ? ticket.body
                            : ticket.body.length > 85
                            ? `${ticket.body.slice(0, 85)}...`
                            : ticket.body}
                          {ticket.body.length > 85 && (
                            <button
                              type="button"
                              className="btn-text-showmore"
                              onClick={(e) => toggleExpandIssue(e, ticket.id)}
                            >
                              {isExpanded ? ' Show less' : ' Show more'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Department / Category */}
                    <td className="cell-department">
                      <span className={`department-pill dept-${ticket.category || 'other'}`}>
                        {ticket.category || 'General'}
                      </span>
                    </td>

                    {/* Issue Date */}
                    <td className="cell-date">
                      {formatDate(ticket.created_at)}
                    </td>

                    {/* Seen / Unseen Status (WhatsApp style) */}
                    <td className="cell-seen-status">
                      {!isSeen ? (
                        <span className="whatsapp-unseen-badge" title="New unread ticket">
                          <span className="whatsapp-dot" />
                          Unseen
                        </span>
                      ) : (
                        <span className="whatsapp-seen-badge" title="Viewed">
                          <CheckCheck size={14} className="whatsapp-checks" />
                          Seen
                        </span>
                      )}
                    </td>

                    {/* Ticket Status */}
                    <td className="cell-status">
                      <span className={`status-pill-badge status-${ticket.status || 'new'}`}>
                        {isClosed
                          ? 'Closed'
                          : ticket.status === 'in_progress'
                          ? 'In Progress'
                          : ticket.status === 'notified'
                          ? 'Notified'
                          : 'New'}
                      </span>
                    </td>

                    {/* Action / Show Transcript */}
                    <td className="cell-action" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-open-ticket"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(ticket);
                        }}
                        title="Open Details & Transcript"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Show more rows button */}
      {visibleCount < filteredTickets.length && (
        <div className="table-pagination-footer">
          <button
            type="button"
            className="btn-show-more-rows"
            onClick={() => setVisibleCount((prev) => prev + 10)}
          >
            Show more tickets ({filteredTickets.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
