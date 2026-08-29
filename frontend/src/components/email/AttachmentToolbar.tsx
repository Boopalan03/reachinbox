import React, { useRef } from 'react';
import { Paperclip, Image as ImageIcon, Music, Folder } from 'lucide-react';

interface AttachmentToolbarProps {
  onFilesSelected: (files: File[]) => void;
}

export const AttachmentToolbar: React.FC<AttachmentToolbarProps> = ({ onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
    // Reset input so the same file can be selected again if removed
    e.target.value = '';
  };

  const ToolbarBtn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, children, title }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700"
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center space-x-1">
      {/* Hidden Inputs */}
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
      />
      <input
        type="file"
        multiple
        className="hidden"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
      />
      <input
        type="file"
        multiple
        className="hidden"
        ref={audioInputRef}
        onChange={handleFileChange}
        accept="audio/mp3,audio/wav,audio/ogg,audio/*"
      />
      <input
        type="file"
        multiple
        className="hidden"
        ref={folderInputRef}
        onChange={handleFileChange}
        {...{ webkitdirectory: "true", directory: "true" } as any} // React typings workaround
      />

      {/* Buttons */}
      <ToolbarBtn title="Attach File" onClick={() => fileInputRef.current?.click()}>
        <Paperclip size={16} />
      </ToolbarBtn>
      <ToolbarBtn title="Add Image" onClick={() => imageInputRef.current?.click()}>
        <ImageIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn title="Add Audio" onClick={() => audioInputRef.current?.click()}>
        <Music size={16} />
      </ToolbarBtn>
      <ToolbarBtn title="Add Folder" onClick={() => folderInputRef.current?.click()}>
        <Folder size={16} />
      </ToolbarBtn>
    </div>
  );
};
