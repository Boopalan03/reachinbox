import React from 'react';
import { X, FileText, Image as ImageIcon, Music, File } from 'lucide-react';

interface AttachmentListProps {
  attachments: File[];
  onRemove: (index: number) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  const totalSize = attachments.reduce((acc, file) => acc + file.size, 0);
  const formattedTotalSize = formatBytes(totalSize);

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Attachments ({attachments.length})
        </h4>
        <span className="text-xs text-gray-400 font-medium">Total: {formattedTotalSize}</span>
      </div>
      <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto pr-1">
        {attachments.map((file, index) => (
          <AttachmentItem
            key={`${file.name}-${index}`}
            file={file}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
    </div>
  );
};

interface AttachmentItemProps {
  file: File;
  onRemove: () => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ file, onRemove }) => {
  const getIcon = () => {
    if (file.type.startsWith('image/')) return <ImageIcon size={16} className="text-blue-500" />;
    if (file.type.startsWith('audio/')) return <Music size={16} className="text-purple-500" />;
    if (file.type === 'application/pdf') return <FileText size={16} className="text-red-500" />;
    return <File size={16} className="text-gray-500" />;
  };

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-2 shadow-sm">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="p-1.5 bg-gray-50 rounded">
          {getIcon()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm text-gray-700 font-medium truncate" title={file.name}>
            {file.name}
          </span>
          <span className="text-xs text-gray-400">
            {formatBytes(file.size)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-2 flex-shrink-0"
        title="Remove attachment"
      >
        <X size={16} />
      </button>
    </div>
  );
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
