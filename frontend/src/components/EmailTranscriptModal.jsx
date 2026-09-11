import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Home,
  Wrench,
  CheckCircle2,
  Copy,
  Check,
  Send,
  User,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCheck,
  Clock,
  Briefcase
} from 'lucide-react';
import { sendTicketQuote, approveTicketQuote, teamResolveAndClose } from '../api';

export default function EmailTranscriptModal({
  ticket,
  onClose,
  onConfirmFix,
  onStatusChange,
  onDelete
}) {
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript', 'quote', 'resolve'
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [customReplies, setCustomReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyTarget, setReplyTarget] = useState('user'); // 'user' (green) or 'teams' (blue)

  // Quotation form state
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState(
    ticket?.quote_title || `Diagnostic & Service Estimate — ${ticket?.subject || 'Issue'}`
  );
  const [quoteAmount, setQuoteAmount] = useState(ticket?.quote_amount || '$65.00');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [quoteNotes, setQuoteNotes] = useState(
    'All repair labor includes a 30-day workmanship warranty. Payment due upon satisfactory completion.'
  );

  const defaultOptions = [
    {
      label: 'Standard Repair & Labor',
      price: '$65.00',
      description: 'Covers on-site inspection, standard sealing/servicing, and 30-day labor warranty.'
    },
    {
      label: 'Full Replacement + 1-Yr Warranty',
      price: '$135.00',
      description: 'Complete replacement of worn component with OEM parts and full 1-year coverage.'
    },
    {
      label: 'Priority Same-Day Expedited Service',
      price: '$190.00',
      description: 'Immediate priority dispatch with dedicated certified contractor and after-hours testing.'
    }
  ];

  // Resolution form state
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState(
    ticket?.resolution_notes ||
      `On-site inspection completed for ${ticket?.home || 'unit'}. Identified root cause, repaired faulty parts, and verified normal operation under testing.`
  );
  const [finalBill, setFinalBill] = useState(ticket?.final_bill || ticket?.quote_amount || '$65.00');
  const [technicianName, setTechnicianName] = useState(
    ticket?.assigned_team ? `${ticket.assigned_team.split('@')[0]} Specialist` : 'Lead Maintenance Technician'
  );

  // Load custom replies from localStorage
  useEffect(() => {
    if (!ticket?.id) return;
    try {
      const saved = localStorage.getItem(`ticket_replies_${ticket.id}`);
      if (saved) {
        setCustomReplies(JSON.parse(saved));
      } else {
        setCustomReplies([]);
      }
    } catch {
      setCustomReplies([]);
    }
  }, [ticket?.id]);

  if (!ticket) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Pending';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const residentName = ticket.resident_email ? ticket.resident_email.split('@')[0] : 'Resident';

  // Handle Send Quotation
  const handleSendQuotation = async (e) => {
    e?.preventDefault();
    try {
      setIsSendingQuote(true);
      const chosenOpt = defaultOptions[selectedOptionIndex];
      const res = await sendTicketQuote(ticket.id, {
        quote_title: quoteTitle,
        quote_amount: chosenOpt.price || quoteAmount,
        quote_options: defaultOptions,
        notes: quoteNotes,
      });

      // Update in place
      ticket.quote_status = 'sent';
      ticket.quote_title = quoteTitle;
      ticket.quote_amount = chosenOpt.price || quoteAmount;

      // Add green bubble note to conversation stream
      const quoteBubble = {
        id: Date.now(),
        target: 'user',
        text: `📋 [OFFICIAL ACKNOWLEDGEMENT & SERVICE QUOTATION SENT VIA EMAIL]\nTitle: ${quoteTitle}\nSelected Option: ${chosenOpt.label} (${chosenOpt.price})\nTerms: ${quoteNotes}\nStatus: Quotation Sent to ${ticket.resident_email}. Awaiting Resident Approval.`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...customReplies, quoteBubble];
      setCustomReplies(updated);
      localStorage.setItem(`ticket_replies_${ticket.id}`, JSON.stringify(updated));

      setActiveTab('transcript');
    } catch (err) {
      alert('Error sending quotation: ' + err.message);
    } finally {
      setIsSendingQuote(false);
    }
  };

  // Handle Resident Approves Quotation
  const handleApproveQuotation = async () => {
    try {
      setIsSendingQuote(true);
      const chosenOpt = defaultOptions[selectedOptionIndex];
      await approveTicketQuote(ticket.id, chosenOpt.label);

      ticket.quote_status = 'approved';
      ticket.status = 'in_progress';

      const approvalBubble = {
        id: Date.now(),
        target: 'user',
        text: `✅ [RESIDENT APPROVAL CONFIRMED]\nResident approved "${chosenOpt.label}" (${chosenOpt.price}).\nService authorized and maintenance team notified to commence work.`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...customReplies, approvalBubble];
      setCustomReplies(updated);
      localStorage.setItem(`ticket_replies_${ticket.id}`, JSON.stringify(updated));
    } catch (err) {
      alert('Error approving quotation: ' + err.message);
    } finally {
      setIsSendingQuote(false);
    }
  };

  // Handle Team Resolution & Close
  const handleTeamResolveAndClose = async (e) => {
    e?.preventDefault();
    try {
      setIsResolving(true);
      await teamResolveAndClose(ticket.id, {
        resolution_notes: resolutionNotes,
        final_bill: finalBill,
        technician_name: technicianName,
      });

      ticket.status = 'confirmed_fixed';
      ticket.resolution_notes = resolutionNotes;
      ticket.final_bill = finalBill;
      ticket.resolved_at = new Date().toISOString();
      ticket.closed_at = new Date().toISOString();

      const teamResolveBubble = {
        id: Date.now(),
        target: 'teams',
        text: `🛠️ [DESIGNATED TEAM COMPLETION & FINAL INVOICE EMAIL SENT]\nTechnician: ${technicianName}\nResolution Report: ${resolutionNotes}\nFinal Bill: ${finalBill}\nStatus: Work confirmed & ticket closed successfully!`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...customReplies, teamResolveBubble];
      setCustomReplies(updated);
      localStorage.setItem(`ticket_replies_${ticket.id}`, JSON.stringify(updated));

      setActiveTab('transcript');
    } catch (err) {
      alert('Error closing ticket: ' + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  // Custom chat reply
  const handleSendCustomReply = (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;

    const newReply = {
      id: Date.now(),
      target: replyTarget,
      text: replyText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = [...customReplies, newReply];
    setCustomReplies(updated);
    try {
      localStorage.setItem(`ticket_replies_${ticket.id}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setReplyText('');
  };

  const handleCopyTranscript = () => {
    let text = `===========================================
WHATSAPP EMAIL CONVERSATION TRANSCRIPT (TICKET #${ticket.id})
===========================================

[RESIDENT / USER]:
From: ${ticket.resident_email}
Date: ${formatDate(ticket.created_at)}
Subject: ${ticket.subject}

${ticket.body}

-------------------------------------------
[OUR ACKNOWLEDGEMENT & QUOTATION TO RESIDENT (USER)]:
To: ${ticket.resident_email}
Estimated Amount: ${ticket.quote_amount || '$65.00'}
Quotation Status: ${ticket.quote_status || 'Sent'}
Title: ${ticket.quote_title || 'Service Estimate'}

-------------------------------------------
[OUR DISPATCH TO TEAMS]:
To: ${ticket.assigned_team || 'facilities-team@example.com'}
Subject: [Ticket #${ticket.id}] New ${ticket.category} issue — ${ticket.home || 'unit unknown'}

Ticket #${ticket.id}
Home: ${ticket.home || 'not specified'}
Category: ${ticket.category || 'other'}
Resident: ${ticket.resident_email}
Original request: ${ticket.body}
`;

    if (ticket.resolution_notes) {
      text += `\n-------------------------------------------\n[DESIGNATED TEAM RESOLUTION & FINAL BILL]:\nFinal Bill: ${ticket.final_bill || '$65.00'}\nWork Performed: ${ticket.resolution_notes}\nStatus: Confirmed Fixed & Closed\n`;
    }

    if (customReplies.length > 0) {
      text += `\n-------------------------------------------\nCONVERSATION EXCHANGES:\n`;
      customReplies.forEach((r) => {
        text += `\n[${r.target === 'user' ? 'REPLY TO RESIDENT' : 'DISPATCH TO TEAMS'}] (${formatDate(r.timestamp)}):\n${r.text}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const senderInitial = (ticket.resident_email || 'U')[0].toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="transcript-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Contact Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="resident-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
              {senderInitial}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
                  {ticket.resident_email}
                </span>
                <span className="ticket-id-tag">#{ticket.id}</span>
                <span className={`status-badge ${ticket.status}`}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
                {ticket.quote_status && ticket.quote_status !== 'pending' && (
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: ticket.quote_status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: ticket.quote_status === 'approved' ? '#34d399' : '#fbbf24',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    Quote: {ticket.quote_status.toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '3px' }}>
                <span>Unit: <strong>{ticket.home || 'Not specified'}</strong></span>
                <span>•</span>
                <span>Category: <strong style={{ textTransform: 'capitalize' }}>{ticket.category || 'General'}</strong></span>
                <span>•</span>
                <span>Assigned: <code>{ticket.assigned_team || 'facilities-team@example.com'}</code></span>
              </div>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose} title="Close transcript">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          
          {/* Navigation Tabs Bar */}
          <div className="modal-nav-tabs">
            <button
              className={`modal-nav-btn ${activeTab === 'transcript' ? 'active' : ''}`}
              onClick={() => setActiveTab('transcript')}
            >
              <Mail size={16} />
              WhatsApp Email Transcript
            </button>
            <button
              className={`modal-nav-btn ${activeTab === 'quote' ? 'active nav-quote' : ''}`}
              onClick={() => setActiveTab('quote')}
            >
              <FileText size={16} />
              Send Acknowledgement & Bill Quotation
              {ticket.quote_status === 'approved' && <span style={{ color: '#34d399' }}>✓</span>}
            </button>
            <button
              className={`modal-nav-btn ${activeTab === 'resolve' ? 'active nav-resolve' : ''}`}
              onClick={() => setActiveTab('resolve')}
            >
              <Briefcase size={16} />
              Designated Team Resolution & Close
              {ticket.status === 'confirmed_fixed' && <span style={{ color: '#60a5fa' }}>✓</span>}
            </button>
          </div>

          {/* TAB 1: WHATSAPP CHAT TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="whatsapp-chat-container">

              {/* Legend */}
              <div className="whatsapp-channel-legend">
                <span className="legend-badge legend-user">
                  ⚪ Resident (User Email)
                </span>
                <span className="legend-badge legend-reply-user">
                  🟢 Our Reply to User (Quotation & Acknowledgement)
                </span>
                <span className="legend-badge legend-reply-teams">
                  🔵 Our Reply to Teams (Dispatch & Work Report)
                </span>
              </div>

              {/* Date divider */}
              <div className="whatsapp-date-divider">
                TICKET #{ticket.id} • {formatDate(ticket.created_at)}
              </div>

              {/* Messages Stream */}
              <div className="whatsapp-messages-stream">

                {/* 1. Incoming Resident Email (User Bubble, Left) */}
                <div className="whatsapp-bubble whatsapp-bubble-user">
                  <div className="whatsapp-bubble-header">
                    <span className="bubble-sender-title">
                      <User size={14} style={{ color: '#94a3b8' }} />
                      {ticket.resident_email}
                    </span>
                    <span className="bubble-tag-pill tag-user-pill">Resident (User)</span>
                  </div>

                  <div className="bubble-subject-box">
                    Subject: {ticket.subject}
                  </div>

                  <div className="bubble-message-text">
                    {ticket.body || '(Empty message)'}
                  </div>

                  <div className="whatsapp-bubble-footer">
                    <span>{formatTime(ticket.created_at)}</span>
                  </div>
                </div>

                {/* 2. Our Reply to Resident (Green Outgoing Bubble, Right) */}
                <div className="whatsapp-bubble whatsapp-bubble-reply-user">
                  <div className="whatsapp-bubble-header">
                    <span className="bubble-sender-title">
                      <span>🟢</span> Our Reply to Resident (Acknowledgement & Quotation)
                    </span>
                    <span className="bubble-tag-pill tag-reply-user-pill">
                      To: {ticket.resident_email}
                    </span>
                  </div>

                  <div className="bubble-message-text">
{`Dear ${residentName},

We acknowledge receipt of your maintenance request regarding "${ticket.subject}".
Your ticket has been logged under Ticket #${ticket.id} and assigned to our ${ticket.category || 'maintenance'} team.

--- SERVICE ESTIMATE & BILL QUOTATION ---
Estimate Title: ${ticket.quote_title || quoteTitle}
Estimated Base Cost: ${ticket.quote_amount || defaultOptions[0].price}

Available Options:
  • Standard Repair & Labor: $65.00 (Standard 30-day labor warranty)
  • Full Replacement + 1-Yr Warranty: $135.00 (OEM parts & coverage)
  • Priority Same-Day Expedited Service: $190.00 (Dedicated contractor dispatch)

Status: ${ticket.quote_status === 'approved' ? 'APPROVED BY RESIDENT ✓' : 'Awaiting Resident Approval'}
Please reply to this thread to confirm your selection or approve work.`}
                  </div>

                  <div className="whatsapp-bubble-footer">
                    <span>{formatTime(ticket.created_at)}</span>
                    <span className="whatsapp-ticks">✓✓</span>
                  </div>
                </div>

                {/* 3. Our Dispatch to Maintenance Team (Blue Outgoing Bubble, Right) */}
                <div className="whatsapp-bubble whatsapp-bubble-reply-teams">
                  <div className="whatsapp-bubble-header">
                    <span className="bubble-sender-title">
                      <span>🔵</span> Our Reply to Maintenance Team (Dispatch)
                    </span>
                    <span className="bubble-tag-pill tag-reply-teams-pill">
                      To: {ticket.assigned_team || 'facilities-team@example.com'}
                    </span>
                  </div>

                  <div className="bubble-subject-box" style={{ background: 'rgba(0,0,0,0.3)', borderColor: '#60a5fa' }}>
                    [Ticket #{ticket.id}] New {ticket.category} issue — {ticket.home || 'unit unknown'}
                  </div>

                  <div className="bubble-message-text" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
{`Ticket #${ticket.id}
Home: ${ticket.home || 'not specified'}
Category: ${ticket.category || 'other'}
Resident: ${ticket.resident_email}

Resident Issue Description:
${ticket.body}

Action Required:
After inspecting and repairing the problem, send final resolution details & close ticket via:
POST /tickets/${ticket.id}/team-resolve-and-close`}
                  </div>

                  <div className="whatsapp-bubble-footer">
                    <span>{formatTime(ticket.notified_at || ticket.created_at)}</span>
                    <span className="whatsapp-ticks">✓✓</span>
                  </div>
                </div>

                {/* 4. Designated Team Resolution Report (If resolved, Blue Bubble) */}
                {ticket.resolution_notes && (
                  <div className="whatsapp-bubble whatsapp-bubble-reply-teams">
                    <div className="whatsapp-bubble-header">
                      <span className="bubble-sender-title">
                        <span>🔵</span> Designated Team Resolution & Final Bill Email
                      </span>
                      <span className="bubble-tag-pill tag-reply-teams-pill">
                        To: {ticket.resident_email}
                      </span>
                    </div>

                    <div className="bubble-subject-box" style={{ background: 'rgba(0,0,0,0.3)', borderColor: '#34d399' }}>
                      [Ticket #{ticket.id} RESOLVED] Work Completed & Final Invoice
                    </div>

                    <div className="bubble-message-text">
{`Work Completion Report:
${ticket.resolution_notes}

Final Bill: ${ticket.final_bill || '$65.00'}
Status: RESOLUTION CONFIRMED & TICKET FORMALLY CLOSED`}
                    </div>

                    <div className="whatsapp-bubble-footer">
                      <span>{formatTime(ticket.resolved_at)}</span>
                      <span className="whatsapp-ticks">✓✓</span>
                    </div>
                  </div>
                )}

                {/* Additional Custom Replies */}
                {customReplies.map((reply) => {
                  const isUser = reply.target === 'user';
                  return (
                    <div
                      key={reply.id}
                      className={`whatsapp-bubble ${isUser ? 'whatsapp-bubble-reply-user' : 'whatsapp-bubble-reply-teams'}`}
                    >
                      <div className="whatsapp-bubble-header">
                        <span className="bubble-sender-title">
                          <span>{isUser ? '🟢' : '🔵'}</span>
                          {isUser ? 'Our Reply to Resident (User)' : 'Our Dispatch to Maintenance Team (Teams)'}
                        </span>
                        <span className={`bubble-tag-pill ${isUser ? 'tag-reply-user-pill' : 'tag-reply-teams-pill'}`}>
                          To: {isUser ? ticket.resident_email : (ticket.assigned_team || 'facilities-team@example.com')}
                        </span>
                      </div>

                      <div className="bubble-message-text">
                        {reply.text}
                      </div>

                      <div className="whatsapp-bubble-footer">
                        <span>{formatTime(reply.timestamp)}</span>
                        <span className="whatsapp-ticks">✓✓</span>
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* Compose Bar */}
              <div className="whatsapp-compose-bar">
                <div className="compose-channel-switch">
                  <span className="channel-switch-label">Reply Channel:</span>
                  <button
                    type="button"
                    className={`switch-btn switch-btn-user ${replyTarget === 'user' ? 'active' : ''}`}
                    onClick={() => setReplyTarget('user')}
                  >
                    🟢 Reply to Resident (User)
                  </button>
                  <button
                    type="button"
                    className={`switch-btn switch-btn-teams ${replyTarget === 'teams' ? 'active' : ''}`}
                    onClick={() => setReplyTarget('teams')}
                  >
                    🔵 Reply to Maintenance Team (Teams)
                  </button>
                </div>

                <form className="compose-input-row" onSubmit={handleSendCustomReply}>
                  <input
                    type="text"
                    className="compose-input"
                    placeholder={
                      replyTarget === 'user'
                        ? `Type an email update to resident (${ticket.resident_email})...`
                        : `Type an email update to team (${ticket.assigned_team || 'facilities-team@example.com'})...`
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={`compose-send-btn ${replyTarget === 'user' ? 'send-btn-user' : 'send-btn-teams'}`}
                    disabled={!replyText.trim()}
                    title="Send email message"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: SEND ACKNOWLEDGEMENT & BILL QUOTATION (WITH OPTIONS) */}
          {activeTab === 'quote' && (
            <div className="action-panel-card">
              <div className="action-panel-header">
                <div className="action-panel-title">
                  <FileText size={20} style={{ color: '#10b981' }} />
                  Send Acknowledgement & Bill Quotation to Resident
                </div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: ticket.quote_status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: ticket.quote_status === 'approved' ? '#34d399' : '#fbbf24',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  Status: {ticket.quote_status ? ticket.quote_status.toUpperCase() : 'PENDING'}
                </span>
              </div>

              <form onSubmit={handleSendQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group-custom">
                  <label className="form-label-custom">Resident Recipient Email</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    disabled
                    value={`${ticket.resident_email} (Unit: ${ticket.home || 'Unspecified'})`}
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Quotation Title</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Quotation Options Grid */}
                <div className="form-group-custom">
                  <label className="form-label-custom">Select Proposed Service Option & Base Price</label>
                  <div className="quote-options-grid">
                    {defaultOptions.map((opt, idx) => {
                      const isSelected = selectedOptionIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`quote-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedOptionIndex(idx);
                            setQuoteAmount(opt.price);
                          }}
                        >
                          <div className="quote-opt-top">
                            <span className="quote-opt-label">{opt.label}</span>
                            <span className="quote-opt-price">{opt.price}</span>
                          </div>
                          <p className="quote-opt-desc">{opt.description}</p>
                          {isSelected && (
                            <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 700 }}>
                              ✓ Default Proposed Option
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Warranty Terms & Additional Notes</label>
                  <textarea
                    className="form-textarea-custom"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSendingQuote}
                  >
                    <Mail size={16} />
                    {isSendingQuote ? 'Sending Quotation Email...' : 'Send Official Quotation Email to Resident'}
                  </button>

                  {ticket.quote_status === 'sent' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleApproveQuotation}
                      disabled={isSendingQuote}
                      style={{ borderColor: '#10b981', color: '#34d399' }}
                    >
                      <CheckCircle2 size={16} />
                      Simulate Resident Approving Option ({defaultOptions[selectedOptionIndex].price})
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DESIGNATED TEAM RESOLUTION & CLOSE TICKET */}
          {activeTab === 'resolve' && (
            <div className="action-panel-card">
              <div className="action-panel-header">
                <div className="action-panel-title">
                  <Briefcase size={20} style={{ color: '#60a5fa' }} />
                  Designated Team Resolution Report & Final Closure
                </div>
                <span className={`status-badge ${ticket.status}`}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>

              <form onSubmit={handleTeamResolveAndClose} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Designated Maintenance Team</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      disabled
                      value={ticket.assigned_team || 'facilities-team@example.com'}
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Lead Technician Name</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Final Bill / Invoice Amount</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      value={finalBill}
                      onChange={(e) => setFinalBill(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Detailed Work Completion Notes (Emailed to Resident)</label>
                  <textarea
                    className="form-textarea-custom"
                    rows={4}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    required
                  />
                </div>

                <div style={{ paddingTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}
                    disabled={isResolving || ticket.status === 'confirmed_fixed'}
                  >
                    <Mail size={16} />
                    <CheckCircle2 size={16} />
                    {ticket.status === 'confirmed_fixed'
                      ? 'Ticket Already Closed & Resolution Sent'
                      : isResolving
                      ? 'Sending Resolution Email & Closing...'
                      : 'Send Resolution Email to Resident & Close Ticket'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyTranscript}>
              {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              {copied ? 'Copied Full Transcript!' : 'Copy Transcript'}
            </button>
            
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: '#f43f5e' }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete Ticket #${ticket.id}?`)) {
                  onDelete(ticket.id);
                  onClose();
                }
              }}
            >
              Delete Ticket
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('quote')}
              style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
            >
              <FileText size={14} />
              Quotation Section
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('resolve')}
              style={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
            >
              <Briefcase size={14} />
              Team Resolution Section
            </button>

            {ticket.status !== 'confirmed_fixed' && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => onConfirmFix(ticket.id)}
              >
                <CheckCircle2 size={16} />
                Quick Confirm Fix
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
