import React, { useRef, useState } from 'react';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { parseEmails } from '../../utils/parseEmails';
import type { ParsedEmails } from '../../utils/parseEmails';

interface CsvUploaderProps {
  onParsed: (result: ParsedEmails) => void;
  error?: string;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onParsed, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please upload a .csv or .txt file');
      return;
    }
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseEmails(content);
      onParsed(parsed);
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".csv,.txt" 
          className="hidden" 
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
          <div className="p-3 bg-gray-100 rounded-full text-gray-500">
            {fileName ? <FileType size={24} className="text-blue-500" /> : <Upload size={24} />}
          </div>
          <div className="text-sm font-medium text-gray-700">
            {fileName ? fileName : 'Click or drag file to this area to upload'}
          </div>
          <div className="text-xs text-gray-500">
            Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.
          </div>
        </div>
      </div>
      {error && (
        <div className="flex items-center mt-2 text-sm text-red-600">
          <AlertCircle size={16} className="mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};
