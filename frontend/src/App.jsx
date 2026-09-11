import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import TicketList from './components/TicketList';
import EmailTranscriptModal from './components/EmailTranscriptModal';
import {
  fetchTickets,
  fetchStats,
  checkHealth,
  confirmTicketFix,
  updateTicketStatus,
  pollMailbox,
  seedSampleTickets,
  deleteTicket
} from './api';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [ticketsData, statsData] = await Promise.all([
        fetchTickets(),
        fetchStats(),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
      setIsOnline(true);

      // If a modal is open, keep its data fresh
      if (selectedTicket) {
        const updated = ticketsData.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      const online = await checkHealth();
      setIsOnline(online);
    }
  }, [selectedTicket]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Polling interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Manual Poll Trigger
  const handlePollNow = async () => {
    try {
      setIsPolling(true);
      await pollMailbox();
      showToast('Mailbox polled! Checking for newly arrived resident emails...');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Mailbox poll triggered (check server logs).');
      await loadData();
    } finally {
      setIsPolling(false);
    }
  };

  // Seed realistic sample data
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await seedSampleTickets();
      showToast(`Added ${res.seeded || 5} realistic resident email threads!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to seed sample data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Confirm Fix
  const handleConfirmFix = async (ticketId) => {
    try {
      const updated = await confirmTicketFix(ticketId);
      showToast(`Ticket #${ticketId} confirmed fixed and marked closed!`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      // Refresh stats
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error(err);
      showToast('Failed to confirm fix: ' + err.message);
    }
  };

  // Status Change
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updated = await updateTicketStatus(ticketId, newStatus);
      showToast(`Ticket #${ticketId} status changed to ${newStatus.replace('_', ' ')}`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error(err);
      showToast('Failed to update status: ' + err.message);
    }
  };

  // Delete ticket
  const handleDeleteTicket = async (ticketId) => {
    try {
      await deleteTicket(ticketId);
      showToast(`Ticket #${ticketId} deleted`);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error(err);
      showToast('Failed to delete ticket: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Toast alert banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#f8fafc',
            padding: '12px 20px',
            borderRadius: '12px',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span style={{ color: '#10b981' }}>✓</span> {toastMessage}
        </div>
      )}

      {/* Main Header / Navigation */}
      <Navbar
        isOnline={isOnline}
        isPolling={isPolling}
        onPollNow={handlePollNow}
        isSeeding={isSeeding}
        onSeedData={handleSeedData}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onRefresh={loadData}
      />

      {/* Top Level Metric Cards & Category Visualizer */}
      <StatsOverview
        stats={stats}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Interactive Ticket Management & Grid */}
      <TicketList
        tickets={tickets}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenTranscript={(ticket) => setSelectedTicket(ticket)}
        onConfirmFix={handleConfirmFix}
      />

      {/* Email Conversation Transcript Modal */}
      {selectedTicket && (
        <EmailTranscriptModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onConfirmFix={handleConfirmFix}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTicket}
        />
      )}
    </div>
  );
}
