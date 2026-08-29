import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, RefreshCcw, Check } from 'lucide-react';

interface HeaderProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  filterStatus?: string;
  setFilterStatus?: (s: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  setSearchQuery = () => {},
  filterStatus = 'All',
  setFilterStatus = () => {},
  onRefresh = () => {},
  isRefreshing = false
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const statuses = ['All', 'Sent', 'Scheduled', 'Queued', 'Delayed', 'Failed', 'Draft'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white h-[88px] flex items-center px-8 w-full z-10 border-b border-gray-100">
      <div className="flex items-center w-full">
        <div className="relative flex-1 max-w-[600px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-3 py-2 bg-[#F8F9F9] border-transparent rounded-full text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-200 transition-colors"
            placeholder="Search"
          />
        </div>
        <div className="flex items-center space-x-6 ml-6 text-gray-400">
          
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`hover:text-gray-600 transition-colors relative ${filterStatus !== 'All' ? 'text-brand-green' : ''}`}
            >
              <Filter size={20} strokeWidth={1.5} />
              {filterStatus !== 'All' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-green rounded-full"></span>
              )}
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setIsFilterOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between text-gray-700"
                  >
                    {status}
                    {filterStatus === status && <Check size={14} className="text-brand-green" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => !isRefreshing && onRefresh()}
            className={`hover:text-gray-600 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCcw size={20} strokeWidth={1.5} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
};
