'use client';

import React, { useEffect, useState } from 'react';
import { History, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, X, Clock } from 'lucide-react';
import { VerdictBand, ModuleType } from '@/lib/types';

interface HistoryItem {
  id: string;
  moduleType: ModuleType;
  inputUrl: string;
  score: number;
  verdict: VerdictBand;
  explanation: string;
  createdAt: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onSelect }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white border-l border-rose-200 h-full flex flex-col shadow-2xl animate-slideLeft">
        {/* Header */}
        <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base font-heading">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <History className="w-4 h-4" />
            </div>
            <span>Audit Trail & Recent Checks</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-white">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading audit records...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No audit records stored in SQLite database yet.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-md cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {item.moduleType}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${
                      item.score < 45
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : item.score < 80
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {item.score < 45 ? (
                      <ShieldAlert className="w-3 h-3" />
                    ) : item.score < 80 ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )}
                    {item.score}/100 ({item.verdict})
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-mono truncate font-medium">{item.inputUrl}</p>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {item.explanation}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-rose-600 font-bold group-hover:underline flex items-center gap-1">
                    View Details <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
