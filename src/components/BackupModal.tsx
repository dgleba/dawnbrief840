import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  FileCode, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Share2,
  ALargeSmall,
  Sliders,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  getBackupAsJSONString, 
  importFullBackupFromJSON, 
  exportPodcastsAsOPML, 
  importPodcastsFromOPML, 
  getStorageStats, 
  clearAllDawnbriefStorage,
  DawnbriefBackupData
} from '../lib/storage';
import { SmallTextSize } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  smallTextSize: SmallTextSize;
  onSmallTextSizeChange: (size: SmallTextSize) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  smallTextSize,
  onSmallTextSizeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'copy' | 'file' | 'opml' | 'storage'>('settings');
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storageStats, setStorageStats] = useState({ formattedSize: '0 KB', podcastsCount: 0, hasAISummary: false });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current JSON representation
      try {
        const json = getBackupAsJSONString();
        setJsonText(json);
        setStorageStats(getStorageStats());
      } catch (e) {
        console.warn('Failed to load storage string:', e);
      }
      setCopied(false);
      setStatusMessage(null);
      setConfirmReset(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Copy JSON to Clipboard
  const handleCopyJSON = async () => {
    try {
      const json = getBackupAsJSONString();
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setStatusMessage({ type: 'success', text: 'All LocalStorage data copied to clipboard as JSON!' });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback if clipboard API is constrained
      const textArea = document.createElement('textarea');
      textArea.value = getBackupAsJSONString();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setStatusMessage({ type: 'success', text: 'Copied JSON backup to clipboard!' });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // 2. Restore JSON from Paste Text
  const handleRestoreFromText = () => {
    setStatusMessage(null);
    try {
      if (!jsonText.trim()) {
        setStatusMessage({ type: 'error', text: 'Please paste or enter valid JSON data first.' });
        return;
      }
      importFullBackupFromJSON(jsonText);
      setStatusMessage({ type: 'success', text: 'Data successfully restored from JSON!' });
      setStorageStats(getStorageStats());
      onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Invalid JSON format. Please verify the backup text.' });
    }
  };

  // 3. Download JSON File
  const handleDownloadJSON = () => {
    try {
      const json = getBackupAsJSONString();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `dawnbrief-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'Downloaded backup file: dawnbrief-backup.json' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to generate JSON download file.' });
    }
  };

  // 4. Upload JSON File
  const handleUploadJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        importFullBackupFromJSON(content);
        setJsonText(content);
        setStatusMessage({ type: 'success', text: `Successfully restored backup from ${file.name}!` });
        setStorageStats(getStorageStats());
        onDataRestored();
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Failed to restore file: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  // 5. Download OPML Podcast Subscriptions
  const handleDownloadOPML = () => {
    try {
      const opml = exportPodcastsAsOPML();
      const blob = new Blob([opml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `dawnbrief-subscriptions-${dateStr}.opml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'Downloaded OPML podcast subscriptions file!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to export OPML file.' });
    }
  };

  // 6. Upload OPML File
  const handleUploadOPMLFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importPodcastsFromOPML(content);
        setStatusMessage({ type: 'success', text: `Imported ${res.importedCount} podcasts from OPML file!` });
        setJsonText(getBackupAsJSONString());
        setStorageStats(getStorageStats());
        onDataRestored();
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `OPML Import Error: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  // 7. Reset / Wipe Storage
  const handleResetStorage = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    clearAllDawnbriefStorage();
    setStorageStats(getStorageStats());
    setJsonText(getBackupAsJSONString());
    setStatusMessage({ type: 'success', text: 'All local storage data has been reset to defaults.' });
    setConfirmReset(false);
    onDataRestored();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F9F7F2] border border-[#DED9CE] w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white/80 border-b border-[#DED9CE] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6B705C]/10 border border-[#6B705C]/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-[#6B705C]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#4A4A3F] font-serif">
                Backup & Restore Local Data
              </h3>
              <p className="text-xs text-[#4A4A3F]/60">
                Save or transfer your podcast subscriptions, settings, and briefings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4A4A3F]/60 hover:text-[#4A4A3F] hover:bg-[#EDE9DF] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-[#EDE9DF]/50 border-b border-[#DED9CE] flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-[#F9F7F2] text-[#6B705C] border-t border-x border-[#DED9CE] shadow-xs'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F]'
            }`}
          >
            <ALargeSmall className="w-3.5 h-3.5" />
            <span>Settings & Text Size</span>
          </button>

          <button
            onClick={() => setActiveTab('copy')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 ${
              activeTab === 'copy'
                ? 'bg-[#F9F7F2] text-[#6B705C] border-t border-x border-[#DED9CE] shadow-xs'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F]'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Clipboard JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-[#F9F7F2] text-[#6B705C] border-t border-x border-[#DED9CE] shadow-xs'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F]'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>File Backup (.json)</span>
          </button>

          <button
            onClick={() => setActiveTab('opml')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 ${
              activeTab === 'opml'
                ? 'bg-[#F9F7F2] text-[#6B705C] border-t border-x border-[#DED9CE] shadow-xs'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Podcast OPML</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'bg-[#F9F7F2] text-[#6B705C] border-t border-x border-[#DED9CE] shadow-xs'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Storage Status</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b shrink-0 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 0: SETTINGS & SMALL FONT SIZING */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Small Font Legibility Card */}
              <div className="p-5 rounded-2xl bg-white border border-[#DED9CE] space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ALargeSmall className="w-5 h-5 text-[#6B705C]" />
                      <h4 className="text-base font-bold text-[#4A4A3F]">Small Font Items Legibility</h4>
                    </div>
                    <p className="text-xs text-[#4A4A3F]/75 mt-1 leading-relaxed">
                      Targeted scaling for smaller items (dates, publish timestamps, audio durations, podcast categories, descriptions, bullet points, and badges) while keeping titles and headings at standard size.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#8C927B]/15 text-[#6B705C] border border-[#8C927B]/30 shrink-0">
                    {smallTextSize === 'normal' ? 'Standard 100%' : smallTextSize === 'large' ? 'Large +20%' : 'Extra Large +40%'}
                  </span>
                </div>

                {/* Size Choice Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      onSmallTextSizeChange('normal');
                      setStatusMessage({ type: 'success', text: 'Small text scale set to Standard (100%).' });
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      smallTextSize === 'normal'
                        ? 'border-[#8C927B] bg-[#EDE9DF] text-[#4A4A3F] ring-1 ring-[#8C927B]'
                        : 'border-[#DED9CE] hover:border-[#8C927B]/60 hover:bg-[#F9F7F2] text-[#4A4A3F]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Standard</span>
                      {smallTextSize === 'normal' && <Check className="w-4 h-4 text-[#6B705C]" />}
                    </div>
                    <span className="text-[11px] text-[#4A4A3F]/60 mt-1">Default 100% small text</span>
                  </button>

                  <button
                    onClick={() => {
                      onSmallTextSizeChange('large');
                      setStatusMessage({ type: 'success', text: 'Small text scale increased by +20% for improved clarity.' });
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      smallTextSize === 'large'
                        ? 'border-[#8C927B] bg-[#EDE9DF] text-[#4A4A3F] ring-1 ring-[#8C927B]'
                        : 'border-[#DED9CE] hover:border-[#8C927B]/60 hover:bg-[#F9F7F2] text-[#4A4A3F]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Large (+20%)</span>
                      {smallTextSize === 'large' && <Check className="w-4 h-4 text-[#6B705C]" />}
                    </div>
                    <span className="text-[11px] text-[#4A4A3F]/60 mt-1">Comfortable reading for tags & dates</span>
                  </button>

                  <button
                    onClick={() => {
                      onSmallTextSizeChange('larger');
                      setStatusMessage({ type: 'success', text: 'Small text scale increased by +40% for maximum legibility.' });
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      smallTextSize === 'larger'
                        ? 'border-[#8C927B] bg-[#EDE9DF] text-[#4A4A3F] ring-1 ring-[#8C927B]'
                        : 'border-[#DED9CE] hover:border-[#8C927B]/60 hover:bg-[#F9F7F2] text-[#4A4A3F]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Extra Large (+40%)</span>
                      {smallTextSize === 'larger' && <Check className="w-4 h-4 text-[#6B705C]" />}
                    </div>
                    <span className="text-[11px] text-[#4A4A3F]/60 mt-1">Maximum visibility for fine print</span>
                  </button>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-[#F9F7F2] border border-[#DED9CE] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B705C]">
                    Live Font Preview (Notice Heading Size Remains Consistent)
                  </span>
                  <div className="p-3 bg-white rounded-lg border border-[#DED9CE] space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#6B705C] bg-[#8C927B]/15 px-2 py-0.5 rounded-md border border-[#8C927B]/30">
                        World News
                      </span>
                      <span className="text-xs text-[#4A4A3F]/70 font-medium">
                        BBC Global News Podcast
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-[#4A4A3F]">
                      Evening World Briefing: International Diplomatic Talks
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-[#4A4A3F]/75 flex-wrap">
                      <span className="flex items-center gap-1 font-mono font-semibold text-[11px]">
                        <Calendar className="w-3 h-3 text-[#6B705C]" /> Aug 16, 2026 5:00 PM
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#EDE9DF] text-[10px] font-bold text-[#6B705C] border border-[#DED9CE]">
                        2h ago
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#6B705C]" /> 5m 30s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Android Pinch Zoom Confirmation Note */}
              <div className="p-4 rounded-2xl bg-[#EDE9DF]/60 border border-[#DED9CE] flex items-center gap-3 text-xs text-[#4A4A3F]">
                <Sparkles className="w-4 h-4 text-[#6B705C] shrink-0" />
                <p>
                  <strong>Pinch-to-zoom enabled:</strong> You can also use two fingers to pinch and zoom in or out freely on mobile touchscreens.
                </p>
              </div>
            </div>
          )}
          
          {/* TAB 1: CLIPBOARD JSON */}
          {activeTab === 'copy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#DED9CE] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#4A4A3F]">Copy All Data to Clipboard</h4>
                  <p className="text-xs text-[#4A4A3F]/70 mt-0.5">
                    Copies your podcast list, settings, and playback position as plain JSON.
                  </p>
                </div>
                <button
                  onClick={handleCopyJSON}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs ${
                    copied 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-[#6B705C] hover:bg-[#8C927B] text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON to Clipboard'}</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#4A4A3F] uppercase tracking-wider">
                    Paste JSON to Restore / Edit
                  </label>
                  <button
                    onClick={handleRestoreFromText}
                    className="text-xs font-bold text-[#6B705C] hover:text-[#4A4A3F] px-3 py-1 rounded-lg bg-[#8C927B]/15 border border-[#8C927B]/30 transition"
                  >
                    Restore from Text
                  </button>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste JSON backup payload here..."
                  className="w-full h-48 p-3 rounded-2xl bg-white border border-[#DED9CE] font-mono text-xs text-[#4A4A3F] focus:outline-none focus:border-[#6B705C] resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: FILE BACKUP (.JSON) */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#DED9CE] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#4A4A3F]">Download JSON Backup File</h4>
                  <p className="text-xs text-[#4A4A3F]/70 mt-0.5">
                    Saves a local <code className="bg-[#EDE9DF] px-1 py-0.5 rounded text-[11px]">.json</code> backup file onto your computer or smartphone.
                  </p>
                </div>
                <button
                  onClick={handleDownloadJSON}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#6B705C] hover:bg-[#8C927B] text-white transition flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#DED9CE] space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-[#4A4A3F]">Upload & Restore Backup File</h4>
                  <p className="text-xs text-[#4A4A3F]/70 mt-0.5">
                    Select a previously downloaded <code className="bg-[#EDE9DF] px-1 py-0.5 rounded text-[11px]">.json</code> file to restore your settings and podcasts.
                  </p>
                </div>
                
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EDE9DF] hover:bg-[#DED9CE] text-[#4A4A3F] font-bold text-xs cursor-pointer transition border border-[#DED9CE]">
                  <Upload className="w-4 h-4 text-[#6B705C]" />
                  <span>Choose JSON File...</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleUploadJSONFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: PODCAST OPML EXPORT / IMPORT */}
          {activeTab === 'opml' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#DED9CE] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#4A4A3F]">Export OPML Subscriptions</h4>
                    <p className="text-xs text-[#4A4A3F]/70 mt-0.5">
                      Export your podcast feed list in standard OPML format compatible with Apple Podcasts, Overcast, Pocket Casts, and AntennaPod.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadOPML}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[#6B705C] hover:bg-[#8C927B] text-white transition flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export OPML File</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#DED9CE] space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-[#4A4A3F]">Import Subscriptions from OPML</h4>
                  <p className="text-xs text-[#4A4A3F]/70 mt-0.5">
                    Import podcast subscriptions exported from another podcast app (<code className="bg-[#EDE9DF] px-1 py-0.5 rounded text-[11px]">.opml</code> or <code className="bg-[#EDE9DF] px-1 py-0.5 rounded text-[11px]">.xml</code> file).
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EDE9DF] hover:bg-[#DED9CE] text-[#4A4A3F] font-bold text-xs cursor-pointer transition border border-[#DED9CE]">
                  <Upload className="w-4 h-4 text-[#6B705C]" />
                  <span>Select OPML File...</span>
                  <input
                    type="file"
                    accept=".opml,.xml,text/xml,application/xml"
                    onChange={handleUploadOPMLFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE STATUS & DANGER ZONE */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-[#DED9CE]">
                  <span className="text-[11px] font-semibold text-[#4A4A3F]/60 uppercase">Storage Used</span>
                  <div className="text-lg font-bold text-[#6B705C] mt-0.5">{storageStats.formattedSize}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#DED9CE]">
                  <span className="text-[11px] font-semibold text-[#4A4A3F]/60 uppercase">Podcasts Saved</span>
                  <div className="text-lg font-bold text-[#4A4A3F] mt-0.5">{storageStats.podcastsCount} Shows</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#DED9CE]">
                  <span className="text-[11px] font-semibold text-[#4A4A3F]/60 uppercase">AI Summary</span>
                  <div className="text-lg font-bold text-[#4A4A3F] mt-0.5">
                    {storageStats.hasAISummary ? 'Cached' : 'None'}
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Reset Local Storage</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Wipes all local storage entries and returns Dawnbrief to initial installation default presets.
                  </p>
                </div>

                <button
                  onClick={handleResetStorage}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs ${
                    confirmReset
                      ? 'bg-rose-700 text-white animate-pulse'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmReset ? 'Click Again to Confirm Reset' : 'Reset All Local Data'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white/80 border-t border-[#DED9CE] flex items-center justify-between text-xs text-[#4A4A3F]/60 shrink-0">
          <span>Dawnbrief Storage Engine v12</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#6B705C] text-white font-semibold hover:bg-[#8C927B] transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
