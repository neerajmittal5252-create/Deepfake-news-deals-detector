'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, CheckCircle2, AlertCircle, RefreshCw, X, Zap, FileCode2, Sparkles, Cpu, Check } from 'lucide-react';
import { HealResult } from '@/lib/types';

interface SelfHealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfHealModal: React.FC<SelfHealModalProps> = ({ isOpen, onClose }) => {
  const [collectorId, setCollectorId] = useState('c_trustcheck_listing_v1');
  const [isLoading, setIsLoading] = useState(false);
  const [healResult, setHealResult] = useState<HealResult | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const handleAutonomousHeal = async () => {
    setIsLoading(true);
    setError(null);
    setIsApproved(false);
    setActiveStep(1);

    try {
      // Step 1: Run Zero-Prompt Autonomous Healing (no human prompt required)
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectorId, action: 'auto' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Autonomous heal failed');
      
      setHealResult(data.result);
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message);
      setActiveStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectorId, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deploy fix');
      setIsApproved(true);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-rose-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                  Autonomous Zero-Prompt Self-Healing
                </h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-sm">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Auto-diagnoses DOM changes and repairs broken selectors with zero human input.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Target Collector Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
              Target Bright Data Collector
            </label>
            <select
              value={collectorId}
              onChange={(e) => {
                setCollectorId(e.target.value);
                setHealResult(null);
                setIsApproved(false);
                setActiveStep(0);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
            >
              <option value="c_trustcheck_listing_v1">c_trustcheck_listing_v1 (Marketplace Listing Scraper)</option>
              <option value="c_trustcheck_seller_v1">c_trustcheck_seller_v1 (Seller History Scraper)</option>
              <option value="c_trustcheck_offer_v1">c_trustcheck_offer_v1 (Promotional Offer Scraper)</option>
              <option value="c_trustcheck_news_v1">c_trustcheck_news_v1 (News Article Scraper)</option>
            </select>
          </div>

          {/* Autonomous Status Callout */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <Cpu className="w-4 h-4 text-rose-600" />
              <span>Zero-Prompt Autonomous Diagnostic Pipeline</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You do not need to write any prompt or describe what is broken. The autonomous engine inspects the live DOM, detects missing price/title nodes, finds replacement schema paths (JSON-LD, Microdata, WooCommerce, OpenGraph), and generates the AST diff instantly.
            </p>
          </div>

          {/* 1-Click Zero-Prompt Action Button */}
          {!healResult && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAutonomousHeal}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning DOM & Auto-Repairing Schema...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Zero-Prompt Auto-Healing Diagnostic</span>
                </>
              )}
            </motion.button>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Diff Result Envelope */}
          <AnimatePresence>
            {healResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-slate-100 shadow-xl"
              >
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-slate-200">Autonomous AST Schema Repair Envelope</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-mono text-[10px] font-black">
                    Auto-Discovered
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900/40">
                    <span className="text-slate-500 mr-2">- Broken Selector:</span>
                    <code>{healResult.diff.oldSelector}</code>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-900/40">
                    <span className="text-slate-500 mr-2">+ Auto-Repaired Selector:</span>
                    <code>{healResult.diff.newSelector}</code>
                  </div>
                  <div className="text-[11px] text-slate-300 pt-1 flex items-center gap-2 font-sans font-medium">
                    <span>Verified Extracted Value:</span>
                    <span className="text-emerald-400 font-bold font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/40">
                      {healResult.diff.sampleExtractedValue}
                    </span>
                  </div>
                </div>

                {!isApproved ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Deploy Healed Collector Live to Production</span>
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3 font-semibold"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-white">Collector Healed & Deployed Live!</div>
                      <div className="text-[11px] text-emerald-300/80 font-normal">
                        Schema fix committed to Bright Data crawler. Scrapes will now extract using the repaired selector.
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
