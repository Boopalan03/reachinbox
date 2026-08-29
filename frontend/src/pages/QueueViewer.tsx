import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { emailService } from '../services/email.service';
import type { Email } from '../types/email';
import { format } from 'date-fns';
import { Activity, Clock, CheckCircle2, AlertCircle, Timer, Loader2 } from 'lucide-react';

export const QueueViewer: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>('waiting');

  const fetchQueue = async () => {
    try {
      const data = await emailService.getAllEmails();
      setEmails(data);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 2 seconds for real-time monitoring
    const interval = setInterval(fetchQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  const waitingJobs = emails.filter(e => e.status === 'SCHEDULED');
  const activeJobs = emails.filter(e => e.status === 'PROCESSING');
  const completedJobs = emails.filter(e => e.status === 'SENT');
  const failedJobs = emails.filter(e => e.status === 'FAILED');
  const delayedJobs = emails.filter(e => e.status === 'DELAYED');

  const getDisplayedJobs = () => {
    switch (activeTab) {
      case 'waiting': return waitingJobs;
      case 'active': return activeJobs;
      case 'completed': return completedJobs;
      case 'failed': return failedJobs;
      case 'delayed': return delayedJobs;
      default: return waitingJobs;
    }
  };

  const displayedJobs = getDisplayedJobs();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar 
        scheduledCount={waitingJobs.length + activeJobs.length + delayedJobs.length} 
        sentCount={completedJobs.length} 
      />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Activity className="text-blue-600" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Background Job Queue</h1>
              <p className="text-xs text-gray-500">Live SQLite Scheduler Monitor</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* BullMQ Style Tabs */}
            <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 mb-6 shadow-sm overflow-x-auto">
              <TabButton 
                active={activeTab === 'waiting'} 
                onClick={() => setActiveTab('waiting')} 
                icon={<Clock size={16} />} 
                label="Waiting" 
                count={waitingJobs.length}
                color="text-orange-600"
                bg="bg-orange-50"
              />
              <TabButton 
                active={activeTab === 'active'} 
                onClick={() => setActiveTab('active')} 
                icon={<Loader2 size={16} className="animate-spin" />} 
                label="Active" 
                count={activeJobs.length}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <TabButton 
                active={activeTab === 'completed'} 
                onClick={() => setActiveTab('completed')} 
                icon={<CheckCircle2 size={16} />} 
                label="Completed" 
                count={completedJobs.length}
                color="text-green-600"
                bg="bg-green-50"
              />
              <TabButton 
                active={activeTab === 'failed'} 
                onClick={() => setActiveTab('failed')} 
                icon={<AlertCircle size={16} />} 
                label="Failed" 
                count={failedJobs.length}
                color="text-red-600"
                bg="bg-red-50"
              />
              <TabButton 
                active={activeTab === 'delayed'} 
                onClick={() => setActiveTab('delayed')} 
                icon={<Timer size={16} />} 
                label="Delayed" 
                count={delayedJobs.length}
                color="text-yellow-600"
                bg="bg-yellow-50"
              />
            </div>

            {/* Job Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamps</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && displayedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                          Loading queue data...
                        </td>
                      </tr>
                    ) : displayedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No jobs in this queue.
                        </td>
                      </tr>
                    ) : (
                      displayedJobs.map(job => (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {job.id.substring(0, 8)}...
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{job.recipient}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">{job.subject}</div>
                            {job.errorMessage && (
                              <div className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded font-mono truncate max-w-xs">
                                {job.errorMessage}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.attempts || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            <div><span className="font-medium">Created:</span> {format(new Date(job.createdAt), "HH:mm:ss")}</div>
                            {job.scheduledAt && <div><span className="font-medium">Scheduled:</span> {format(new Date(job.scheduledAt), "HH:mm:ss")}</div>}
                            {job.processingStartedAt && <div><span className="font-medium">Processing:</span> {format(new Date(job.processingStartedAt), "HH:mm:ss")}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Helper Component for Tabs
const TabButton = ({ active, onClick, icon, label, count, color, bg }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md transition-all ${
      active 
        ? `${bg} ${color} shadow-sm border border-${color.split('-')[1]}-200` 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`}
  >
    <span className={`mr-2 ${active ? '' : 'text-gray-400'}`}>{icon}</span>
    {label}
    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
      active ? 'bg-white bg-opacity-60' : 'bg-gray-100'
    }`}>
      {count}
    </span>
  </button>
);
