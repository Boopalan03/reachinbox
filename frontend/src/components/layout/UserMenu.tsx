import React, { useState } from 'react';
import type { User } from '../../types/auth';
import { LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';

export const UserMenu: React.FC<{ user: User }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    // In a real app, call logout API and clear context
    window.location.href = '/login';
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 hover:bg-gray-100 p-2 rounded-md transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
          {user.avatar ? <img src={user.avatar} alt={user.name} className="rounded-full w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-700 leading-none">{user.name}</p>
        </div>
        <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 border border-gray-100">
          <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <UserIcon size={16} className="mr-3 text-gray-400" />
            Profile
          </button>
          <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Settings size={16} className="mr-3 text-gray-400" />
            Settings
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} className="mr-3 text-red-500" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
