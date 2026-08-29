import React from 'react';
import { ArrowLeft, Star, Archive, Trash2, ChevronDown } from 'lucide-react';
import type { Email } from '../../types/email';
import { format } from 'date-fns';
import { authService } from '../../services/auth.service';

interface EmailViewProps {
  email: Email;
  onBack: () => void;
  onStar: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EmailView: React.FC<EmailViewProps> = ({ email, onBack, onStar, onArchive, onDelete }) => {
  const user = authService.getCurrentUser();
  // Format dates and names
  const date = new Date(email.createdAt);
  const dateString = format(date, "MMM d, h:mm a");
  const senderName = email.recipient.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Format body
  const bodyContent = email.body || 'No content provided.';
  
  // Use real attachments from the email
  const actualAttachments = email.attachments || [];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-normal text-gray-800">
            {email.subject || 'No Subject'}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <button onClick={() => onStar(email.id)} className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${email.isStarred ? 'text-yellow-400' : ''}`}>
            <Star size={18} strokeWidth={1.5} fill={email.isStarred ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onArchive(email.id)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Archive size={18} strokeWidth={1.5} />
          </button>
          <button onClick={() => onDelete(email.id)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <Trash2 size={18} strokeWidth={1.5} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name} 
              className="w-8 h-8 rounded-full ml-2 object-cover" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`;
              }}
            />
          ) : (
            <img 
              src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
              alt="Me" 
              className="w-8 h-8 rounded-full ml-2 object-cover" 
            />
          )}
        </div>
      </div>

      {/* Email Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-16 py-8">
        
        {/* Sender Info Row */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
              {senderName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[15px] text-gray-900">{senderName}</span>
                <span className="text-sm text-gray-400">&lt;{email.recipient}&gt;</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-0.5 cursor-pointer hover:text-gray-700">
                to me <ChevronDown size={14} className="ml-1" />
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {dateString}
          </div>
        </div>

        {/* Email Body */}
        <div 
          className="text-[15px] text-gray-800 leading-relaxed mb-10 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />

        {/* Attachments Grid */}
        {actualAttachments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            {actualAttachments.map((att: any, idx) => (
              <div key={idx} className="flex flex-col border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-gray-50/50 cursor-pointer group">
                <div className="h-32 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                  {att.mimeType?.includes('image') ? (
                    <img 
                      src={`http://localhost:5000/${att.path}`} 
                      alt={att.filename}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">📄 Document</span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-gray-800 truncate mb-1">{att.filename}</p>
                  <p className="text-[10px] text-gray-400">{(att.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
