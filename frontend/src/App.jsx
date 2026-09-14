import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import TicketList from './components/TicketList';
import EmailTranscriptModal from './components/EmailTranscriptModal';
import LoginPage from './components/LoginPage';
import {
  fetchTickets,
  fetchStats,
  checkHealth,
  confirmTicketFix,
  updateTicketStatus,
  pollMailbox,
  seedSampleTickets,
  getStoredUser,
  getStoredToken,
  fetchCurrentUser,
  logoutUser,
} from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [authToken, setAuthToken] = useState(getStoredToken());
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const selectedTicketIdRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Track seen ticket IDs (WhatsApp style unread indicator)
  const [seenTicketIds, setSeenTicketIds] = useState(() => {
    try {
      const saved = localStorage.getItem('seen_ticket_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleMarkSeen = (ticketId) => {
    setSeenTicketIds((prev) => {
      if (prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.add(ticketId);
      localStorage.setItem('seen_ticket_ids', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleOpenTranscript = (ticket) => {
    if (!ticket) return;
    selectedTicketIdRef.current = ticket.id;
    handleMarkSeen(ticket.id);
    setSelectedTicket(ticket);
  };

  const handleCloseTranscript = () => {
    selectedTicketIdRef.current = null;
    setSelectedTicket(null);
  };

  // Check token validity on mount
  useEffect(() => {
    if (authToken) {
      fetchCurrentUser(authToken).then((user) => {
        if (!user) {
          setCurrentUser(null);
          setAuthToken(null);
        } else {
          setCurrentUser(user);
        }
      }).catch(() => {});
    }
  }, [authToken]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [ticketsData, statsData] = await Promise.all([
        fetchTickets(),
        fetchStats(),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
      setIsOnline(true);

      // Safely update open modal only if user still has it open
      const currentOpenId = selectedTicketIdRef.current;
      if (currentOpenId) {
        const updated = ticketsData.find((t) => t.id === currentOpenId);
        if (updated && selectedTicketIdRef.current === currentOpenId) {
          setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      const online = await checkHealth();
      setIsOnline(online);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  useEffect(() => {
    if (!currentUser || !autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentUser, autoRefresh, loadData]);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    showToast(`Welcome back, ${user.name}!`);
  };

  const handleLogout = async () => {
    await logoutUser();
    handleCloseTranscript();
    setCurrentUser(null);
    setAuthToken(null);
    showToast('Signed out successfully.');
  };

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

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await seedSampleTickets();
      showToast(`Updated resident threads / added ${res.seeded || 5} tickets!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to seed sample data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmFix = async (ticketId) => {
    try {
      const updated = await confirmTicketFix(ticketId);
      showToast(`Ticket #${ticketId} marked fixed & closed!`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicketIdRef.current === ticketId) {
        setSelectedTicket(updated);
      }
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error(err);
      showToast('Failed to confirm fix: ' + err.message);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updated = await updateTicketStatus(ticketId, newStatus);
      showToast(`Ticket #${ticketId} status changed to ${newStatus.replace('_', ' ')}`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicketIdRef.current === ticketId) {
        setSelectedTicket(updated);
      }
      fetchStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error(err);
      showToast('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Toast alert */}
      {toastMessage && (
        <div className="minimal-toast-banner">
          <span style={{ color: '#10b981' }}>✓</span> {toastMessage}
        </div>
      )}

      {/* Render Login Page if not authenticated */}
      {!currentUser ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {/* Header */}
          <Navbar
            isOnline={isOnline}
            isPolling={isPolling}
            onPollNow={handlePollNow}
            isSeeding={isSeeding}
            onSeedData={handleSeedData}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            onRefresh={loadData}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Minimalist Stats & Categories Bar */}
          <StatsOverview
            stats={stats}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Clean Table of Tickets */}
          <TicketList
            tickets={tickets}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            seenTicketIds={seenTicketIds}
            onMarkSeen={handleMarkSeen}
            onOpenTranscript={handleOpenTranscript}
          />

          {/* Split Window: Left = Details, Right = Transcript & Email Forward */}
          {selectedTicket && (
            <EmailTranscriptModal
              ticket={selectedTicket}
              onClose={handleCloseTranscript}
              onConfirmFix={handleConfirmFix}
              onStatusChange={handleStatusChange}
            />
          )}
        </>
      )}
    </div>
  );
}
