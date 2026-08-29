import React from 'react';
import type { Email } from '../../types/email';
import { format } from 'date-fns';
import { Clock, Star, AlertCircle, Edit2, Timer, Zap } from 'lucide-react';

interface EmailTableProps {
  emails: Email[];
  onEmailClick?: (email: Email) => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({ emails, onEmailClick }) => {
  return (
    <div className="w-full">
      <div className="flex flex-col">
        {emails.map((email) => {
          // Dynamic date based on status
          const date = new Date((email.status === 'SCHEDULED') ? (email.scheduledAt || email.createdAt) : (email.sentAt || email.createdAt));
          const timeString = format(date, "MMM d, h:mm a");
          
          // Generate plain-text preview from HTML body
          const rawBody = email.body || '';
          const plainTextBody = rawBody.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          const isTruncated = plainTextBody.length > 60;
          const previewText = plainTextBody 
            ? plainTextBody.substring(0, 60) + (isTruncated ? '...' : '') 
            : 'No content preview available...';
          
          // Status Badge Config
          let StatusBadge = (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap tracking-wide">
              {email.status.charAt(0).toUpperCase() + email.status.slice(1).toLowerCase()}
            </span>
          );
          
          if (email.status === 'SCHEDULED') {
            StatusBadge = (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#FFF4E5] text-[#E67E22] whitespace-nowrap tracking-wide">
                <Clock size={12} className="mr-1.5" strokeWidth={2} />
                {timeString}
              </span>
            );
          } else if (email.status === 'PROCESSING') {
            StatusBadge = (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 whitespace-nowrap tracking-wide">
                <Clock size={12} className="mr-1.5" strokeWidth={2} />
                Processing
              </span>
            );
          } else if (email.status === 'DELAYED') {
            const delayedUntilStr = email.delayedUntil 
              ? format(new Date(email.delayedUntil), "h:mm a")
              : '';
            StatusBadge = (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600 whitespace-nowrap tracking-wide"
                title={email.statusReason || `Delayed until ${delayedUntilStr}`}
              >
                <Timer size={12} className="mr-1.5" strokeWidth={2} />
                {delayedUntilStr ? `Delayed → ${delayedUntilStr}` : 'Delayed'}
              </span>
            );
          } else if (email.status === 'FAILED') {
            StatusBadge = (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-600 whitespace-nowrap tracking-wide">
                <AlertCircle size={12} className="mr-1.5" strokeWidth={2} />
                Failed
              </span>
            );
          } else if (email.status === 'DRAFT') {
             StatusBadge = (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 whitespace-nowrap tracking-wide">
                <Edit2 size={12} className="mr-1.5" strokeWidth={2} />
                Draft
              </span>
            );
          }

          return (
            <div 
              key={email.id} 
              onClick={() => onEmailClick?.(email)}
              className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group px-2 cursor-pointer"
            >
              <div className="flex items-center flex-1 overflow-hidden">
                <div className="w-64 flex-shrink-0 text-[13px] font-semibold text-gray-800 truncate pr-4" title={`To: ${email.recipient}`}>
                  To: {email.recipient.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                
                <div className="flex items-center flex-1 overflow-hidden">
                  <div className="flex-shrink-0 mr-4">
                    {StatusBadge}
                  </div>
                  
                  <div className="text-[13px] truncate flex items-center">
                    <span className="font-semibold text-gray-800">{email.subject || '(No Subject)'}</span>
                    <span className="mx-1.5 text-gray-400">-</span>
                    <span className="text-gray-400 font-normal">
                      {previewText}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4 pl-4">
                <button 
                  className={`transition-colors ${email.isStarred ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                >
                  <Star size={16} strokeWidth={1.5} fill={email.isStarred ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
