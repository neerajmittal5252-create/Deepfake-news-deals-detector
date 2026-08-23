'use client';

import React, { useState } from 'react';
import { Code, ChevronDown, ChevronUp, Copy, Check, Terminal } from 'lucide-react';

interface RawDataToggleProps {
  rawData: any;
}

export const RawDataToggle: React.FC<RawDataToggleProps> = ({ rawData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(rawData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-white border border-rose-100 shadow-lg shadow-rose-900/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-rose-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
          <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
            <Code className="w-3.5 h-3.5" />
          </div>
          <span>Bright Data Raw Extraction & SERP Payloads</span>
          <span className="text-[10px] font-extrabold uppercase font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
            JSON
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
          <span>{isOpen ? 'Collapse' : 'Inspect Raw Data'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-rose-100 bg-slate-900 p-5 relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Terminal className="w-3.5 h-3.5 text-rose-400" />
              <span>Extracted Schema Payload</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-xs font-mono text-rose-200 overflow-x-auto p-4 rounded-xl bg-slate-950/90 leading-relaxed max-h-96">
            {formattedJson}
          </pre>
        </div>
      )}
    </div>
  );
};
