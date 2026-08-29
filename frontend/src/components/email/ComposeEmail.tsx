import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Paperclip, Clock, Upload, Send, ChevronDown } from 'lucide-react';
import { emailService } from '../../services/email.service';
import { parseEmails } from '../../utils/parseEmails';
import type { ParsedEmails } from '../../utils/parseEmails';
import { authService } from '../../services/auth.service';
import { AttachmentToolbar } from './AttachmentToolbar';
import { AttachmentList } from './AttachmentList';

interface ComposeEmailProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeEmail: React.FC<ComposeEmailProps> = ({ onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [delay, setDelay] = useState('00');
  const [limit, setLimit] = useState('00');

  const user = authService.getCurrentUser();
  const fromEmail = user?.email || 'oliver.brown@domain.io';

  const [parsedData, setParsedData] = useState<ParsedEmails | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Rich text editor state
  const [formatState, setFormatState] = useState({
    bold: false, italic: false, underline: false,
    justifyLeft: true, justifyCenter: false, justifyRight: false, justifyFull: false,
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // ─── Formatting helpers ───
  const execCmd = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateFormatState();
  }, []);

  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull'),
    });
  }, []);

  const getEditorHTML = (): string => {
    return editorRef.current?.innerHTML || '';
  };

  const getEditorText = (): string => {
    return editorRef.current?.innerText?.trim() || '';
  };

  // ─── File upload ───
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseEmails(content);
      setParsedData(prev => ({
        emails: prev ? [...prev.emails, ...parsed.emails] : parsed.emails,
        invalidCount: prev ? prev.invalidCount + parsed.invalidCount : parsed.invalidCount,
        duplicateCount: prev ? prev.duplicateCount + parsed.duplicateCount : parsed.duplicateCount,
      }));
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAttachmentsAdded = (newFiles: File[]) => {
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Recipient management ───
  const handleRemoveEmail = (emailToRemove: string) => {
    if (!parsedData) return;
    const remaining = parsedData.emails.filter(e => e !== emailToRemove);
    setParsedData(remaining.length > 0 ? { ...parsedData, emails: remaining } : null);
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newEmail = emailInput.trim();
      if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        setParsedData(prev => ({
          emails: prev ? [...prev.emails, newEmail] : [newEmail],
          invalidCount: prev ? prev.invalidCount : 0,
          duplicateCount: prev ? prev.duplicateCount : 0,
        }));
        setEmailInput('');
      }
    }
  };

  const allEmails = parsedData?.emails || [];
  const visibleEmails = allEmails.slice(0, 3);
  const extraEmailsCount = Math.max(0, allEmails.length - 3);

  // ─── Auto-dismiss success toast ───
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ─── Send Now ───
  const handleSendNow = async () => {
    setError(null);
    setSuccessMsg(null);

    if (allEmails.length === 0) {
      setError('Please add at least one recipient.');
      return;
    }

    // Automatically route large lists to the background scheduler
    if (allEmails.length > 5) {
      return handleScheduleSend();
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!getEditorText()) {
      setError('Email content cannot be empty.');
      return;
    }

    const htmlContent = getEditorHTML();

    try {
      setSendingNow(true);
      // Send to every recipient
      for (const recipient of allEmails) {
        const result = await emailService.sendNow({
          to: recipient,
          subject: subject.trim(),
          content: htmlContent,
          attachments,
        });
        if (result.previewUrl) {
          console.log('Preview URL:', result.previewUrl);
        }
      }
      setSuccessMsg(`Email sent successfully to ${allEmails.length} recipient(s)!`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send email.');
    } finally {
      setSendingNow(false);
    }
  };

  // ─── Save Draft ───
  const handleSaveDraft = async () => {
    setError(null);
    setSuccessMsg(null);

    if (allEmails.length === 0) {
      setError('Please add at least one recipient to save as draft.');
      return;
    }

    const htmlContent = getEditorHTML();

    try {
      setSavingDraft(true);
      for (const recipient of allEmails) {
        await emailService.saveDraft({
          to: recipient,
          subject: subject.trim(),
          content: htmlContent,
          attachments,
        });
      }
      setSuccessMsg(`Draft saved successfully!`);
      setTimeout(() => onSuccess(), 1500); // Close after a moment
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // ─── Schedule Send ───
  const handleScheduleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (allEmails.length === 0) {
      setError('Please add at least one recipient.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!getEditorText()) {
      setError('Email content cannot be empty.');
      return;
    }

    const htmlContent = getEditorHTML();

    try {
      setLoading(true);
      await emailService.scheduleEmails({
        subject: subject.trim(),
        body: htmlContent,
        recipients: allEmails,
        startTime: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString(),
        delayBetweenEmails: (parseInt(delay) || 0) * 1000,
        hourlyLimit: parseInt(limit) || 100,
        attachments,
      });
      setSuccessMsg(`Successfully scheduled ${allEmails.length} email(s)!`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  // ─── Toolbar button helper ───
  const ToolbarBtn: React.FC<{
    active?: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    title?: string;
  }> = ({ active, onMouseDown, children, title }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(e); }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-brand-green/10 text-brand-green'
          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center">
          <button onClick={onClose} className="mr-4 text-gray-700 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-normal text-gray-800">Compose New Email</h2>
        </div>

        <div className="flex items-center space-x-4 relative">
          <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={18} strokeWidth={1.5} />
          </button>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <Clock size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleSendNow}
            disabled={loading || sendingNow}
            className="px-6 py-1.5 border border-brand-green text-brand-green text-sm font-medium rounded-full hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            {sendingNow ? 'Sending...' : 'Send'}
          </button>

          {/* Send Later Popover */}
          {showDatePicker && (
            <div className="absolute top-12 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
              <h3 className="font-medium text-sm text-gray-800 mb-3">Send Later</h3>
              <input
                type="datetime-local"
                value={selectedDate}
                className="w-full text-sm border-b border-gray-100 pb-3 focus:outline-none mb-3 text-gray-500 font-light"
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <div className="space-y-4 text-sm text-gray-600 mt-2 font-light">
                <div className="cursor-pointer hover:text-brand-green transition-colors">Tomorrow</div>
                <div className="cursor-pointer hover:text-brand-green transition-colors">Tomorrow, 10:00 AM</div>
                <div className="cursor-pointer hover:text-brand-green transition-colors">Tomorrow, 11:00 AM</div>
                <div className="cursor-pointer hover:text-brand-green transition-colors">Tomorrow, 3:00 PM</div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button onClick={() => setShowDatePicker(false)} className="text-sm font-medium text-gray-900">Cancel</button>
                <button onClick={handleScheduleSend} className="text-sm font-medium border border-brand-green text-brand-green px-5 py-1.5 rounded-full hover:bg-green-50">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="max-w-4xl w-full mx-auto px-8 pt-6 flex-1 flex flex-col relative">
        {/* From */}
        <div className="flex items-center py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-medium text-gray-800">From</span>
          <div className="px-3 py-1.5 bg-gray-50 rounded text-sm text-gray-600 flex items-center cursor-pointer border border-gray-100/50">
            {fromEmail}
            <ChevronDown size={14} className="ml-2 text-gray-400" />
          </div>
        </div>

        {/* To */}
        <div className="flex items-center py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-medium text-gray-800">To</span>
          <div className="flex-1 flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {(isExpanded ? allEmails : visibleEmails).map(email => (
                <span key={email} className="px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-sm flex items-center">
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="ml-2 hover:text-red-500 rounded-full p-0.5 transition-colors focus:outline-none"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {!isExpanded && extraEmailsCount > 0 && (
                <button type="button" onClick={() => setIsExpanded(true)} className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                  +{extraEmailsCount} View More
                </button>
              )}
              {isExpanded && allEmails.length > 3 && (
                <button type="button" onClick={() => setIsExpanded(false)} className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                  Show Less
                </button>
              )}
              <input
                type="email"
                placeholder={allEmails.length === 0 ? "recipient@example.com" : "Add another..."}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailInputKeyDown}
                className="flex-1 min-w-[200px] bg-transparent border-none focus:outline-none text-sm placeholder-gray-400 py-1"
              />
            </div>
          </div>
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center text-gray-500 hover:text-gray-700 text-sm font-medium ml-4 transition-colors"
          >
            <Upload size={16} strokeWidth={1.5} className="mr-1.5" />
            Upload List
          </button>
        </div>

        {/* Subject */}
        <div className="flex items-center py-4 border-b border-gray-100">
          <span className="w-24 text-sm font-medium text-gray-800">Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder-gray-400"
          />
        </div>

        {/* Delay & Hourly Limit */}
        <div className="flex items-center py-4">
          <div className="flex items-center mr-8">
            <span className="text-sm font-medium text-gray-800 mr-4">Delay between 2 emails</span>
            <input
              type="text"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              className="w-12 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:border-gray-400 text-gray-500"
            />
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-800 mr-4">Hourly Limit</span>
            <input
              type="text"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-12 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:border-gray-400 text-gray-500"
            />
          </div>
        </div>

        {/* Editor Wrapper */}
        <div className="flex-1 flex flex-col bg-[#F8F9F9] rounded-xl border border-gray-100 mt-2 mb-8 overflow-hidden relative group">
          {/* Toolbar */}
          <div className="px-6 py-4 flex items-center space-x-1 text-gray-400 flex-wrap relative z-10">
            {/* Undo */}
            <ToolbarBtn title="Undo" onMouseDown={() => execCmd('undo')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </ToolbarBtn>
            {/* Redo */}
            <ToolbarBtn title="Redo" onMouseDown={() => execCmd('redo')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-300 mx-3"></div>

            {/* Bold */}
            <ToolbarBtn active={formatState.bold} title="Bold" onMouseDown={() => execCmd('bold')}>
              <span className="font-serif font-medium text-sm">B</span>
            </ToolbarBtn>
            {/* Italic */}
            <ToolbarBtn active={formatState.italic} title="Italic" onMouseDown={() => execCmd('italic')}>
              <span className="font-serif italic text-sm">I</span>
            </ToolbarBtn>
            {/* Underline */}
            <ToolbarBtn active={formatState.underline} title="Underline" onMouseDown={() => execCmd('underline')}>
              <span className="font-serif underline text-sm">U</span>
            </ToolbarBtn>

            <div className="w-px h-5 bg-gray-300 mx-3"></div>

            {/* Align Left */}
            <ToolbarBtn active={formatState.justifyLeft} title="Align Left" onMouseDown={() => execCmd('justifyLeft')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h10M4 18h16" /></svg>
            </ToolbarBtn>
            {/* Align Center */}
            <ToolbarBtn active={formatState.justifyCenter} title="Align Center" onMouseDown={() => execCmd('justifyCenter')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M7 12h10M4 18h16" /></svg>
            </ToolbarBtn>
            {/* Align Right */}
            <ToolbarBtn active={formatState.justifyRight} title="Align Right" onMouseDown={() => execCmd('justifyRight')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M10 12h10M4 18h16" /></svg>
            </ToolbarBtn>
            
            <div className="w-px h-5 bg-gray-300 mx-3"></div>
            
            <AttachmentToolbar onFilesSelected={handleAttachmentsAdded} />
          </div>

          <AttachmentList attachments={attachments} onRemove={handleRemoveAttachment} />

          {/* Editable area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyUp={updateFormatState}
            onMouseUp={updateFormatState}
            className="flex-1 w-full bg-transparent px-8 pb-8 focus:outline-none text-[15px] text-gray-700 overflow-y-auto"
            style={{ minHeight: '16rem' }}
            data-placeholder="Type Your Reply..."
          ></div>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg flex items-center z-50">
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 p-3 bg-red-600 text-white text-sm rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};
