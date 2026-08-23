'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Wrench, History, Sparkles, AlertCircle, Info, ExternalLink, RefreshCw, Layers, ArrowUpRight } from 'lucide-react';
import { ModuleType, CheckResponse } from '@/lib/types';
import { UrlInput } from '@/components/UrlInput';
import { PipelineProgress } from '@/components/PipelineProgress';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { EvidenceList } from '@/components/EvidenceList';
import { RawDataToggle } from '@/components/RawDataToggle';
import { SelfHealModal } from '@/components/SelfHealModal';
import { HistoryDrawer } from '@/components/HistoryDrawer';

export default function HomePage() {
  const [selectedModule, setSelectedModule] = useState<ModuleType>('listing');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);

  const [isHealModalOpen, setIsHealModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleRunCheck = async () => {
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputUrl.trim(), moduleType: selectedModule }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification pipeline encountered an error.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (item: any) => {
    setSelectedModule(item.moduleType);
    setInputUrl(item.inputUrl);
    fetch(`/api/check/${item.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setResult(data);
      })
      .catch((e) => console.warn('Failed to load item detail:', e));
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-24 relative overflow-hidden bg-mesh-pattern selection:bg-rose-500 selection:text-white">
      {/* Decorative Continuous Floating Ambient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[480px] bg-gradient-to-b from-rose-200/55 via-pink-100/35 to-transparent blur-3xl -z-10 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, 25, 0],
          y: [0, -25, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-60 -left-20 w-80 h-80 bg-rose-300/25 rounded-full blur-3xl -z-10 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -25, 0],
          y: [0, 25, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-96 -right-20 w-96 h-96 bg-pink-300/25 rounded-full blur-3xl -z-10 pointer-events-none"
      />

      {/* Top Header Navigation */}
      <header className="border-b border-rose-100/80 bg-white/85 backdrop-blur-xl sticky top-0 z-30 shadow-sm shadow-rose-900/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative group">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-1 bg-gradient-to-r from-rose-500 via-pink-500 to-red-600 rounded-2xl blur-xs opacity-70 group-hover:opacity-100 transition duration-300"
              />
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-rose-950 to-rose-700 bg-clip-text text-transparent font-heading">
                  TrustCheck
                </h1>
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                  Scrape Verse
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Powered by Bright Data Web Unlocker & SERP API
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsHealModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200 text-xs font-black text-rose-700 hover:text-rose-800 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Self-Heal Demo</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-black text-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
              title="View History & Audit Trail"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Audit Trail</span>
            </motion.button>
          </motion.div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-6 text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-black shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-spin-slow" />
          <span>Real-Time Multi-Source Verification + Agentic AI Audit</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] font-heading"
        >
          Verify any link with an{' '}
          <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
            auditable trust verdict
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium"
        >
          Cross-examine secondhand listings, promotional flash deals, and news claims with live Bright Data Web Unlocker, Google SERP, DuckDuckGo tools, and AI intelligence before you buy or believe.
        </motion.p>
      </section>

      {/* Input Box Section */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border border-rose-100 shadow-2xl shadow-rose-900/10 space-y-6"
        >
          <UrlInput
            input={inputUrl}
            setInput={setInputUrl}
            selectedModule={selectedModule}
            setSelectedModule={setSelectedModule}
            onSubmit={handleRunCheck}
            isLoading={isLoading}
          />
        </motion.div>
      </section>

      {/* Pipeline Loader */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <AnimatePresence>
          {isLoading && <PipelineProgress isLoading={isLoading} moduleType={selectedModule} />}
        </AnimatePresence>
      </section>

      {/* Error Banner */}
      {error && (
        <section className="max-w-4xl mx-auto px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 shadow-lg shadow-rose-900/5 font-medium"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <div>
                <span className="font-bold">Analysis Notice: </span>
                <span>{error}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRunCheck}
              className="text-xs px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </motion.button>
          </motion.div>
        </section>
      )}

      {/* Results Display */}
      {result && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto px-4 space-y-6"
        >
          {/* Ethical Disclaimer for News Module */}
          {result.moduleType === 'news' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-slate-800 text-xs flex items-start gap-3.5 shadow-sm"
            >
              <Info className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <span className="font-black uppercase tracking-wider text-rose-700">
                  Ethical & Legal Verification Notice:
                </span>
                <p className="leading-relaxed text-slate-600 font-medium">
                  News claims are evaluated against certified fact-check records (Snopes, PolitiFact, FactCheck.org) and recognized tier-1 wire agency reports. Information should always be verified across primary authoritative records.
                </p>
              </div>
            </motion.div>
          )}

          {/* 1. Score Badge */}
          <TrustScoreBadge
            score={result.score}
            verdict={result.verdict}
            moduleType={result.moduleType}
          />

          {/* 2. AI Explanation Layer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 sm:p-7 rounded-3xl bg-white border border-rose-100 shadow-xl shadow-rose-900/5 space-y-3"
          >
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-200">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-heading font-black text-slate-900">AI Trust Narrative & Market Synthesis</span>
              <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm ml-auto">
                Audited
              </span>
            </div>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-sans font-medium">
              {result.explanation}
            </p>
          </motion.div>

          {/* 3. Evidence Breakdown (Why Genuine vs Why Risky) */}
          <EvidenceList signals={result.signals} />

          {/* 4. Raw Data JSON Inspection */}
          <RawDataToggle rawData={result.rawData} />
        </motion.section>
      )}

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto px-4 mt-20 pt-8 border-t border-rose-100 text-center text-xs text-slate-400 font-medium space-y-2">
        <div className="flex items-center justify-center gap-4 flex-wrap text-slate-500">
          <span>Bright Data Web Unlocker (cli_unlocker)</span>
          <span>•</span>
          <span>Google SERP API (serp_api1)</span>
          <span>•</span>
          <span>Live DuckDuckGo Multi-Engine Tools</span>
          <span>•</span>
          <span>Deterministic Signal Math</span>
        </div>
        <p>Built for the Scrape Verse Hackathon by WeMakeDevs.</p>
      </footer>

      {/* Modals & Drawers */}
      <SelfHealModal
        isOpen={isHealModalOpen}
        onClose={() => setIsHealModalOpen(false)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectHistoryItem}
      />
    </main>
  );
}
