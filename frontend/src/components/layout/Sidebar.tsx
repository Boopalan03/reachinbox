import React, { useState, useEffect } from 'react';
import { Clock, Send, ChevronDown, LogOut, MessageSquare, Loader2, Activity } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { slackService, type SlackStatus } from '../../services/slack.service';

interface SidebarProps {
  scheduledCount?: number;
  sentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ scheduledCount = 0, sentCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isSent = location.search.includes('tab=sent');
  
  const user = authService.getCurrentUser();
  
  let initials = 'U';
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      initials = parts[0][0].toUpperCase();
    }
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  // Slack integration state
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [slackLoading, setSlackLoading] = useState(false);

  useEffect(() => {
    fetchSlackStatus();
  }, []);

  // Check for slack=connected query param (after OAuth redirect)
  useEffect(() => {
    if (location.search.includes('slack=connected')) {
      fetchSlackStatus();
    }
  }, [location.search]);

  const fetchSlackStatus = async () => {
    try {
      const status = await slackService.getStatus();
      setSlackStatus(status);
    } catch {
      // If it fails (e.g., no auth), just show as disconnected
    }
  };

  const handleSlackConnect = () => {
    slackService.connect();
  };

  const handleSlackDisconnect = async () => {
    setSlackLoading(true);
    try {
      await slackService.disconnect();
      setSlackStatus({ connected: false });
    } catch {
      // silently fail
    } finally {
      setSlackLoading(false);
    }
  };

  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 hidden md:flex flex-col flex-shrink-0 min-h-screen">
      {/* Logo */}
      <div className="py-6 px-6">
        <h1 className="text-2xl font-bold tracking-tight uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>ONG</h1>
      </div>

      {/* User Profile */}
      <div className="px-4 mb-6 relative">
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between p-3 bg-[#F8F9F9] rounded-xl cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
                }}
              />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'Oliver+Brown'}&background=random`} alt={user?.name || 'Oliver Brown'} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-gray-900 leading-tight truncate">{user?.name || 'Oliver Brown'}</span>
              <span className="text-xs text-gray-500 truncate w-[140px]">{user?.email || 'oliver.brown@domain.io'}</span>
            </div>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>
          
        {/* Logout dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
            >
              <LogOut size={14} className="mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-4 mb-8">
        <button 
          className="w-full flex justify-center items-center py-2 px-4 border border-brand-green rounded-full text-sm font-medium text-brand-green hover:bg-green-50 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent('open-compose'))}
        >
          Compose
        </button>
      </div>

      {/* Navigation */}
      <div className="px-4">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">
          CORE
        </div>
        <nav className="space-y-1">
          <Link
            to="/dashboard"
            className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/dashboard' && !isSent ? 'bg-brand-green/10 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <Clock size={16} className={`mr-3 ${!isSent ? 'text-gray-900' : 'text-gray-500'}`} />
              Scheduled
            </div>
            <span className="text-xs text-gray-500 font-normal">{scheduledCount}</span>
          </Link>
          
          <Link
            to="/dashboard?tab=sent"
            className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isSent ? 'bg-brand-green/10 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <Send size={16} className={`mr-3 ${isSent ? 'text-gray-900' : 'text-gray-500'}`} />
              Sent
            </div>
            <span className="text-xs text-gray-500 font-normal">{sentCount}</span>
          </Link>
          
          <div className="pt-4 pb-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
              SYSTEM
            </div>
          </div>
          
          <Link
            to="/queue"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/queue' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Activity size={16} className={`mr-3 ${currentPath === '/queue' ? 'text-blue-700' : 'text-gray-500'}`} />
            Queue Viewer
          </Link>
        </nav>
      </div>

      {/* Slack Integration */}
      <div className="px-4 mt-auto mb-6">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">
          INTEGRATIONS
        </div>
        <div className="bg-[#F8F9F9] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <MessageSquare size={16} className="text-[#4A154B]" />
              <span className="text-sm font-medium text-gray-800">Slack</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${slackStatus.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-[11px] text-gray-500">
                {slackStatus.connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
          
          {slackStatus.connected && slackStatus.teamName && (
            <p className="text-[11px] text-gray-400 mb-2 px-0.5">
              {slackStatus.teamName}
            </p>
          )}
          
          {slackStatus.connected ? (
            <button
              onClick={handleSlackDisconnect}
              disabled={slackLoading}
              className="w-full py-1.5 px-3 text-[12px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {slackLoading ? (
                <Loader2 size={12} className="mr-1.5 animate-spin" />
              ) : null}
              Disconnect Slack
            </button>
          ) : (
            <button
              onClick={handleSlackConnect}
              className="w-full py-1.5 px-3 text-[12px] font-medium text-[#4A154B] bg-white hover:bg-purple-50 border border-[#4A154B]/20 rounded-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.527 2.527 0 0 1 0 8.834a2.527 2.527 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.527 2.527 0 0 1 2.522-2.521A2.527 2.527 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Connect Slack
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
