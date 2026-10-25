import React, { useState, useEffect, useRef } from 'react';
import { Radio, Search, ListMusic, Sparkles, Download, ShieldCheck, RefreshCw, Database, ALargeSmall, Check } from 'lucide-react';
import { SmallTextSize } from '../types';

interface NavbarProps {
  activeTab: 'briefing' | 'search' | 'summary';
  setActiveTab: (tab: 'briefing' | 'search' | 'summary') => void;
  briefingCount: number;
  totalDurationSeconds: number;
  onOpenRefreshModal: () => void;
  isRefreshing: boolean;
  hasSummary: boolean;
  onOpenBackup: () => void;
  smallTextSize: SmallTextSize;
  onSmallTextSizeChange: (size: SmallTextSize) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  briefingCount,
  totalDurationSeconds,
  onOpenRefreshModal,
  isRefreshing,
  hasSummary,
  onOpenBackup,
  smallTextSize,
  onSmallTextSizeChange,
}) => {
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close font menu on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setIsFontMenuOpen(false);
      }
    };
    if (isFontMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isFontMenuOpen]);

  useEffect(() => {
    // Listen for PWA installation prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if app is running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    }
  };

  const formatDuration = (totalSecs: number) => {
    if (!totalSecs || totalSecs <= 0) return '0m';
    const mins = Math.floor(totalSecs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const fontOptions: { id: SmallTextSize; label: string; sub: string; boost: string }[] = [
    { id: 'normal', label: 'Standard', boost: '100%', sub: 'Original small text' },
    { id: 'large', label: 'Large Small Font', boost: '+20%', sub: 'Larger dates, tags, & notes' },
    { id: 'larger', label: 'Extra Large Small Font', boost: '+40%', sub: 'High visibility for all fine print' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#F9F7F2]/95 backdrop-blur border-b border-[#DED9CE] text-[#4A4A3F]">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8C927B] flex items-center justify-center shadow-sm">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">

              <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#8C927B]/15 text-[#6B705C] font-semibold border border-[#8C927B]/30">
                Ver 22
              </span>
            </div>

          </div>
        </div>

        {/* Right Section / Controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button (When available) */}
          {deferredInstallPrompt && !isAppInstalled && (
            <button
              onClick={handleInstallPWA}
              className="px-3.5 py-1.5 text-xs rounded-xl bg-[#6B705C] hover:bg-[#8C927B] text-white font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Install Dawnbrief as an App on Android, iOS, or Desktop"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Small Font Legibility Setting Menu */}
          <div className="relative" ref={fontMenuRef}>
            <button
              onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
              title="Adjust Small Font Size (Makes fine print, dates, & descriptions larger without inflating headings)"
              className={`px-3 py-1.5 text-xs rounded-xl transition flex items-center gap-1.5 border shadow-sm font-medium ${
                smallTextSize !== 'normal'
                  ? 'bg-[#8C927B]/15 border-[#8C927B]/40 text-[#6B705C] font-semibold'
                  : 'bg-white hover:bg-[#EDE9DF] border-[#DED9CE] text-[#4A4A3F]'
              }`}
            >
              <ALargeSmall className="w-3.5 h-3.5 text-[#6B705C]" />
              <span className="hidden sm:inline">Small Font</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EDE9DF] text-[#6B705C] border border-[#DED9CE]">
                {smallTextSize === 'normal' ? '100%' : smallTextSize === 'large' ? '+20%' : '+40%'}
              </span>
            </button>

            {/* Dropdown Menu for Small Font Legibility */}
            {isFontMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#DED9CE] p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                <div className="px-2.5 py-1.5 border-b border-[#DED9CE] mb-1">
                  <div className="text-xs font-bold text-[#4A4A3F] flex items-center gap-1.5">
                    <ALargeSmall className="w-4 h-4 text-[#6B705C]" />
                    <span>Small Font Legibility</span>
                  </div>
                  <p className="text-[11px] text-[#4A4A3F]/70 mt-0.5">
                    Enlarges dates, times, descriptions, and labels while keeping large titles normal.
                  </p>
                </div>

                {fontOptions.map((opt) => {
                  const isSelected = smallTextSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onSmallTextSizeChange(opt.id);
                        setIsFontMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 text-xs ${
                        isSelected
                          ? 'bg-[#EDE9DF] text-[#6B705C] font-bold border border-[#DED9CE]'
                          : 'hover:bg-[#F9F7F2] text-[#4A4A3F]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{opt.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                            isSelected ? 'bg-[#6B705C] text-white' : 'bg-[#EDE9DF] text-[#6B705C]'
                          }`}>
                            {opt.boost}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4A4A3F]/60 font-normal mt-0.5">
                          {opt.sub}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#6B705C] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh RSS Feed / Update Button */}
          <button
            onClick={onOpenRefreshModal}
            disabled={isRefreshing}
            title="Refresh podcast episodes dialog"
            className="px-3 py-1.5 text-xs rounded-xl bg-white hover:bg-[#EDE9DF] text-[#4A4A3F] transition flex items-center gap-1.5 border border-[#DED9CE] shadow-sm font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6B705C] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Update</span>
          </button>

          {/* Backup & Restore Storage Modal Button */}
          <button
            onClick={onOpenBackup}
            title="Backup & Restore Local Data (JSON, OPML, Clipboard)"
            className="px-3 py-1.5 text-xs rounded-xl bg-white hover:bg-[#EDE9DF] text-[#4A4A3F] transition flex items-center gap-1.5 border border-[#DED9CE] shadow-sm font-medium"
          >
            <Database className="w-3.5 h-3.5 text-[#6B705C]" />
            <span className="hidden sm:inline">Backup & Settings</span>
          </button>

          {/* Mobile / PWA App Installed Badge */}
          {isAppInstalled && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDE9DF] border border-[#DED9CE] text-xs font-medium text-[#6B705C]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6B705C]" />
              <span>PWA Installed</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Tab Bar */}
      <div className="max-w-6xl mx-auto px-4 border-t border-[#DED9CE]/80 flex items-center justify-between text-sm overflow-x-auto">
        <div className="flex gap-1 py-2">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${
              activeTab === 'briefing'
                ? 'bg-[#8C927B] text-white font-semibold shadow-sm'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>My Briefing</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'briefing' ? 'bg-[#6B705C] text-white' : 'bg-[#DED9CE] text-[#4A4A3F]'
            }`}>
              {briefingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${
              activeTab === 'search'
                ? 'bg-[#8C927B] text-white font-semibold shadow-sm'
                : 'text-[#4A4A3F]/70 hover:text-[#4A4A3F] hover:bg-[#EDE9DF]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search & Add Podcasts</span>
          </button>


        </div>

        {/* Quick Briefing Stats */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-[#4A4A3F]/70 py-1.5">
          <span>
            Total Duration: <strong className="text-[#6B705C] font-semibold">{formatDuration(totalDurationSeconds)}</strong>
          </span>
        </div>
      </div>
    </header>
  );
};
