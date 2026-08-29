import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { EmailTable } from '../components/email/EmailTable';
import { EmailView } from '../components/email/EmailView';
import { ComposeEmail } from '../components/email/ComposeEmail';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { emailService } from '../services/email.service';
import { authService } from '../services/auth.service';
import type { Email } from '../types/email';

export const Dashboard: React.FC = () => {
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const location = useLocation();
  const navigate = useNavigate();
  // We still use activeTab for sidebar highlighting, but filtering is handled by unified state
  const activeTab = location.search.includes('tab=sent') ? 'sent' : 'scheduled';

  const fetchEmails = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else if (allEmails.length === 0) setLoading(true);
      
      setError(null);
      const emails = await emailService.getAllEmails();
      setAllEmails(emails);
    } catch (err: any) {
      if (err.response?.status === 401) {
        authService.logout();
        navigate('/');
      } else {
        setError('Failed to load emails. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/');
      return;
    }

    fetchEmails();
    
    // Auto-refresh every 10 seconds to show real-time progress
    const intervalId = setInterval(() => fetchEmails(false), 10000);
    
    const handleOpenCompose = () => setIsComposeOpen(true);
    window.addEventListener('open-compose', handleOpenCompose);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('open-compose', handleOpenCompose);
    };
  }, []);

  const handleStar = async (id: string) => {
    try {
      const updated = await emailService.toggleStar(id);
      setAllEmails(prev => prev.map(e => e.id === id ? { ...e, isStarred: updated.isStarred } : e));
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isStarred: updated.isStarred } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const updated = await emailService.toggleArchive(id);
      setAllEmails(prev => prev.map(e => e.id === id ? { ...e, isArchived: updated.isArchived } : e));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null); // close the view when archived
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emailService.deleteEmail(id);
      setAllEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute filtered emails based on search, filter dropdown, and active sidebar tab
  const filteredEmails = allEmails
    .filter(email => !email.isArchived) // Filter out archived emails from main views
    .filter(email => {
      // 1. Sidebar tab filter (if not overridden by filter dropdown)
      if (filterStatus === 'All') {
        if (activeTab === 'scheduled' && !['SCHEDULED', 'DELAYED', 'PROCESSING'].includes(email.status)) return false;
        if (activeTab === 'sent' && !['SENT', 'FAILED'].includes(email.status)) return false;
      } else {
        // 2. Dropdown Filter
        if (email.status.toUpperCase() !== filterStatus.toUpperCase()) return false;
      }

      // 3. Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchRecipient = email.recipient.toLowerCase().includes(q);
        const matchSubject = email.subject.toLowerCase().includes(q);
        const matchBody = (email.body || '').toLowerCase().includes(q);
        const matchStatus = email.status.toLowerCase().includes(q);
        
        if (!matchRecipient && !matchSubject && !matchBody && !matchStatus) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort starred emails to the top
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      // Otherwise maintain current order (which is usually by date from backend)
      return 0;
    });

  const pendingCount = allEmails.filter(e => !e.isArchived && e.status === 'SCHEDULED').length;
  const processingCount = allEmails.filter(e => !e.isArchived && e.status === 'PROCESSING').length;
  const sentCount = allEmails.filter(e => !e.isArchived && e.status === 'SENT').length;
  const failedCount = allEmails.filter(e => !e.isArchived && e.status === 'FAILED').length;
  const scheduledCount = pendingCount + processingCount + allEmails.filter(e => !e.isArchived && e.status === 'DELAYED').length;
  const totalCount = allEmails.filter(e => !e.isArchived).length;

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <Sidebar scheduledCount={scheduledCount} sentCount={sentCount} />
      <div className="flex flex-col flex-1 w-full">
        <Header 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onRefresh={() => fetchEmails(true)}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 overflow-y-auto">
          {selectedEmail ? (
            <EmailView 
              email={selectedEmail} 
              onBack={() => setSelectedEmail(null)} 
              onStar={handleStar}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ) : (
            <div className="w-full px-8 pt-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}


            {loading && allEmails.length === 0 ? (
              <div className="py-20 flex justify-center flex-col items-center">
                <Spinner className="w-8 h-8 text-brand-green mb-4" />
                <span className="text-gray-500 text-sm">Loading emails...</span>
              </div>
            ) : filteredEmails.length > 0 ? (
              <>
                <div className="flex gap-4 mb-4 text-xs font-medium bg-gray-50 p-3 rounded-lg border border-gray-100 shadow-sm text-gray-600">
                  <div className="text-gray-800"><span className="font-bold">Total:</span> {totalCount}</div>
                  <div className="text-yellow-600"><span className="font-bold">Scheduled:</span> {pendingCount}</div>
                  <div className="text-blue-600"><span className="font-bold">Processing:</span> {processingCount}</div>
                  <div className="text-green-600"><span className="font-bold">Sent:</span> {sentCount}</div>
                  <div className="text-red-600"><span className="font-bold">Failed:</span> {failedCount}</div>
                  <div className="text-gray-500 ml-auto"><span className="font-bold">Remaining:</span> {pendingCount + processingCount}</div>
                </div>
                <EmailTable emails={filteredEmails} onEmailClick={setSelectedEmail} />
              </>
            ) : (
              <div className="mt-10">
                <EmptyState
                  title={searchQuery || filterStatus !== 'All' ? "No emails found" : (activeTab === 'scheduled' ? "No scheduled emails" : "No sent emails")}
                  description={searchQuery || filterStatus !== 'All' ? "Try adjusting your search or filters." : "Nothing to display here yet."}
                />
              </div>
            )}
            </div>
          )}
        </main>
      </div>

      {isComposeOpen && (
        <ComposeEmail 
          onClose={() => setIsComposeOpen(false)} 
          onSuccess={() => {
            setIsComposeOpen(false);
            fetchEmails(true);
          }} 
        />
      )}
    </div>
  );
};
