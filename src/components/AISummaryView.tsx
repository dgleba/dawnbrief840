import React from 'react';
import { ExecutiveSummary } from '../types';
import { Sparkles, Copy, Check, RefreshCw, Newspaper, FileText, Share2 } from 'lucide-react';

interface AISummaryViewProps {
  summary: ExecutiveSummary | null;
  onGenerate: () => void;
  isLoading: boolean;
  onGoToBriefing: () => void;
}

export const AISummaryView: React.FC<AISummaryViewProps> = ({
  summary,
  onGenerate,
  isLoading,
  onGoToBriefing,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!summary) return;
    const text = `
Daily News Executive Summary (${summary.timestamp}):
${summary.briefingScript}

Top Highlights:
${summary.overallHighlights.map(h => `• ${h}`).join('\n')}

Topic Breakdown:
${summary.topics.map(t => `${t.title}:\n${t.bulletPoints.map(b => `  - ${b}`).join('\n')}`).join('\n\n')}
`;
    navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!summary && !isLoading) {
    return (
      <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-[32px] p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-5 my-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#DED9CE] text-[#6B705C] flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold font-serif text-[#4A4A3F]">AI Executive News Overview</h3>
          <p className="text-[#4A4A3F]/80 text-sm leading-relaxed">
            Generate an instant synthesized text executive summary of all latest news episodes in your briefing queue using Gemini AI.
          </p>
        </div>
        <button
          onClick={onGenerate}
          className="px-6 py-3.5 rounded-full bg-[#8C927B] hover:bg-[#6B705C] text-white font-medium text-sm inline-flex items-center gap-2 shadow-md transition active:scale-95"
        >
          <Sparkles className="w-4 h-4 fill-white" />
          <span>Generate AI News Summary</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-[32px] p-12 text-center max-w-2xl mx-auto space-y-4 my-8 shadow-sm">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-[#8C927B]/20 border-t-[#8C927B] animate-spin" />
          <Sparkles className="w-6 h-6 text-[#6B705C] absolute inset-0 m-auto" />
        </div>
        <div className="space-y-1">
          <h4 className="text-lg font-bold font-serif text-[#4A4A3F]">Analyzing Episode Notes...</h4>
          <p className="text-xs text-[#4A4A3F]/70">Gemini is synthesizing today's news podcast briefings into key takeaways.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      {/* Header Banner */}
      <div className="bg-[#EDE9DF] border border-[#DED9CE] rounded-[32px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#8C927B]/15 text-[#6B705C] border border-[#8C927B]/30 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini Synthesized
              </span>
              <span className="text-xs text-[#4A4A3F]/70 font-medium">
                Generated at {summary?.timestamp} ({summary?.totalEpisodes} podcasts)
              </span>
            </div>
            <h2 className="text-2xl font-bold font-serif text-[#4A4A3F] tracking-tight">
              Executive Briefing Summary
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F9F7F2] text-[#4A4A3F] text-xs font-bold flex items-center gap-1.5 border border-[#DED9CE] transition shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={onGenerate}
              className="p-2 rounded-xl bg-white hover:bg-[#F9F7F2] text-[#6B705C] transition border border-[#DED9CE] shadow-xs"
              title="Regenerate summary"
            >
              <RefreshCw className="w-4 h-4 text-[#6B705C]" />
            </button>
          </div>
        </div>

        {/* Anchor Intro Script */}
        {summary?.briefingScript && (
          <div className="mt-4 p-4 rounded-2xl bg-white/80 border border-[#DED9CE] text-[#4A4A3F] text-sm leading-relaxed italic flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#6B705C] flex-shrink-0 mt-0.5" />
            <span>"{summary.briefingScript}"</span>
          </div>
        )}
      </div>

      {/* Top Breaking Highlights */}
      {summary?.overallHighlights && summary.overallHighlights.length > 0 && (
        <div className="bg-white border border-[#DED9CE] rounded-[24px] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#4A4A3F] flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-[#6B705C]" />
            <span>Top News Highlights</span>
          </h3>
          <ul className="space-y-2.5">
            {summary.overallHighlights.map((hl, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-[#4A4A3F] leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-[#8C927B] mt-2 flex-shrink-0" />
                <span>{hl}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary?.topics?.map((topic, idx) => (
          <div key={idx} className="bg-white border border-[#DED9CE] rounded-[24px] p-6 space-y-3 shadow-xs">
            <h4 className="font-bold text-xs text-[#6B705C] uppercase tracking-wider border-b border-[#DED9CE] pb-2">
              {topic.title}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#4A4A3F] leading-relaxed">
              {topic.bulletPoints?.map((bp, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2">
                  <span className="text-[#8C927B] font-bold">•</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

};
