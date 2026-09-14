import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Send,
  User,
  Home,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Building,
  Check,
  CheckCheck
} from 'lucide-react';
import { getOwnerName, formatDate } from './TicketList';
import { forwardTicketToTeam } from '../api';

export default function EmailTranscriptModal({
  ticket,
  onClose,
  onConfirmFix,
  onStatusChange,
}) {
  const [toEmail, setToEmail] = useState('');
  const [forwardBody, setForwardBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [localTranscript, setLocalTranscript] = useState(ticket?.body || '');
  const chatBottomRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initialize prefilled recipient
  useEffect(() => {
    if (ticket) {
      setToEmail(ticket.assigned_team || `${ticket.category || 'facilities'}-team@grandview-residences.com`);
      setLocalTranscript(ticket.body || '');
    }
  }, [ticket]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localTranscript]);

  // Parse chat messages from ticket body
  const chatMessages = useMemo(() => {
    if (!localTranscript) return [];

    const raw = localTranscript;
    const parts = raw.split(/\n\n--- \[(.*?)\] ---\n/);

    const messages = [];

    // First part is the initial resident email
    if (parts[0]?.trim()) {
      messages.push({
        id: 'initial',
        type: 'resident',
        sender: ticket.resident_email,
        name: getOwnerName(ticket),
        timestamp: formatDate(ticket.created_at),
        subject: ticket.subject,
        text: parts[0].trim(),
      });
    }

    // Subsequent follow-up or forwarded messages
    for (let i = 1; i < parts.length; i += 2) {
      const header = parts[i] || '';
      const text = parts[i + 1] || '';

      const isForward = header.toLowerCase().includes('forwarded');
      const timeMatch = header.split('•')[1]?.trim() || '';

      messages.push({
        id: `msg-${i}`,
        type: isForward ? 'team' : 'resident',
        sender: isForward ? 'Management / Team' : ticket.resident_email,
        name: isForward ? 'Forwarded to Team' : getOwnerName(ticket),
        headerInfo: header,
        timestamp: timeMatch || 'Follow-up',
        text: text.trim(),
      });
    }

    return messages;
  }, [localTranscript, ticket]);

  // Handle simulated email forward to team
  const handleSendForward = async (e) => {
    e?.preventDefault();
    if (!forwardBody.trim() || !toEmail.trim()) return;

    setIsSending(true);
    try {
      const res = await forwardTicketToTeam(ticket.id, toEmail.trim(), forwardBody.trim());
      const updatedBody = res.ticket?.body;
      if (updatedBody) {
        setLocalTranscript(updatedBody);
      } else {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const simulatedAppend = `\n\n--- [Forwarded to Team (${toEmail}) • ${timeNow}] ---\n${forwardBody.trim()}`;
        setLocalTranscript((prev) => prev + simulatedAppend);
      }

      setForwardBody('');
      setSuccessToast(`Forwarded to ${toEmail} (Simulated)`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const simulatedAppend = `\n\n--- [Forwarded to Team (${toEmail}) • ${timeNow}] ---\n${forwardBody.trim()}`;
      setLocalTranscript((prev) => prev + simulatedAppend);
      setForwardBody('');
      setSuccessToast(`Forwarded to ${toEmail} (Simulated)`);
      setTimeout(() => setSuccessToast(''), 4000);
    } finally {
      setIsSending(false);
    }
  };

  if (!ticket) return null;

  const isClosed =
    ticket.status === 'closed' ||
    ticket.status === 'confirmed_fixed' ||
    ticket.status === 'closed_no_confirmation';

  return (
    <div className="transcript-overlay" onClick={onClose}>
      <div className="transcript-split-window" onClick={(e) => e.stopPropagation()}>
        <div className="transcript-two-columns">
          {/* ============================================================
              LEFT COLUMN: Name of owner - & Ticket Details
              ============================================================ */}
          <div className="transcript-left-column">
            <div className="owner-title-banner">
              <span className="owner-label-prefix">Name of owner —</span>
              <h2 className="owner-full-name">{getOwnerName(ticket)}</h2>
            </div>

            <div className="ticket-details-card">
              <div className="detail-item">
                <span className="detail-label">Ticket ID:</span>
                <span className="detail-value id-chip">#{ticket.id}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value text-accent">{ticket.resident_email}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">House details:</span>
                <span className="detail-value house-text">{ticket.home || 'General'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Department:</span>
                <span className={`department-pill dept-${ticket.category || 'other'}`}>
                  {ticket.category ? ticket.category.toUpperCase() : 'GENERAL'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Issue date:</span>
                <span className="detail-value">{formatDate(ticket.created_at)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Ticket status:</span>
                <div className="status-selection-box">
                  <select
                    className="detail-status-dropdown"
                    value={ticket.status || 'new'}
                    onChange={(e) => onStatusChange && onStatusChange(ticket.id, e.target.value)}
                  >
                    <option value="new">New (Unresolved)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="notified">Notified Team</option>
                    <option value="confirmed_fixed">Confirmed Fixed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Quick Confirm / Close Action */}
              {!isClosed && onConfirmFix && (
                <button
                  type="button"
                  className="btn-confirm-fix-left"
                  onClick={() => onConfirmFix(ticket.id)}
                >
                  <CheckCircle2 size={15} />
                  <span>Mark Confirmed & Closed</span>
                </button>
              )}
            </div>

            {/* Issue Overview */}
            <div className="ticket-issue-summary-box">
              <div className="issue-label-small">Issue Subject:</div>
              <div className="issue-title-bold">{ticket.subject || 'Resident Inquiry'}</div>
            </div>
          </div>

          {/* ============================================================
              RIGHT COLUMN: Transcript (Chat System + Forward to Team)
              ============================================================ */}
          <div className="transcript-right-column">
            {/* Clean Header Bar: Transcript Title + Relocated Live Chat Badge on Left, Close X on Right */}
            <div className="transcript-header-bar">
              <div className="transcript-title-group">
                <h3 className="transcript-heading">Transcript</h3>
                <span className="transcript-live-badge">
                  <span className="live-dot" />
                  Live Chat Stream
                </span>
              </div>
              <button
                className="transcript-close-btn"
                onClick={onClose}
                title="Close window (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat message bubbles */}
            <div className="transcript-chat-area">
              {chatMessages.length === 0 ? (
                <div className="chat-empty">No conversation messages logged yet.</div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${msg.type === 'team' ? 'bubble-team' : 'bubble-resident'}`}
                  >
                    <div className="chat-bubble">
                      <div className="chat-bubble-header">
                        <span className="chat-author">{msg.name}</span>
                        <span className="chat-time">{msg.timestamp}</span>
                      </div>
                      {msg.subject && msg.id !== 'initial' && (
                        <div className="chat-subject-line">Sub: {msg.subject}</div>
                      )}
                      <div className="chat-text">{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Success Toast */}
            {successToast && (
              <div className="transcript-toast">
                <Check size={14} />
                <span>{successToast}</span>
              </div>
            )}

            {/* Email forward to team section (matches Image 2 wireframe: to: body: send) */}
            <form onSubmit={handleSendForward} className="forward-team-form">
              <div className="forward-form-title">
                <span>Email forward to team</span>
                <span className="forward-note-pill">Preview only • Not sent externally</span>
              </div>

              <div className="forward-field-row">
                <label className="forward-label" htmlFor="forward-to">
                  to:
                </label>
                <input
                  id="forward-to"
                  type="email"
                  className="forward-input"
                  placeholder="e.g. plumbing-team@grandview-residences.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  required
                />
              </div>

              <div className="forward-field-row align-top">
                <label className="forward-label" htmlFor="forward-body">
                  body:
                </label>
                <textarea
                  id="forward-body"
                  className="forward-textarea"
                  placeholder="Type notes or message to forward to maintenance team..."
                  value={forwardBody}
                  onChange={(e) => setForwardBody(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="forward-actions-row">
                <button
                  type="submit"
                  className="forward-send-btn"
                  disabled={isSending || !forwardBody.trim()}
                >
                  <Send size={14} />
                  <span>{isSending ? 'Forwarding...' : 'send'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
