'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Signal } from '@/lib/types';
import { CheckCircle, AlertOctagon, TrendingUp, TrendingDown, Layers, ShieldAlert, ShieldCheck } from 'lucide-react';

interface EvidenceListProps {
  signals: Signal[];
  weightsUsed?: Record<string, number>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const cardVariants: any = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const EvidenceList: React.FC<EvidenceListProps> = ({ signals }) => {
  const positiveSignals = signals.filter((s) => s.direction === 'positive');
  const negativeSignals = signals.filter((s) => s.direction === 'negative');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Executive Summary: Why Fraud vs Why Genuine */}
      <motion.div
        variants={cardVariants}
        className="p-6 sm:p-7 rounded-3xl bg-white border border-rose-100 shadow-xl shadow-rose-900/5 space-y-5"
      >
        <div className="flex items-center gap-3 text-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-100 flex items-center justify-center text-rose-600 border border-rose-200 shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-heading">
              Direct Audit Summary
            </h3>
            <p className="text-xs text-slate-500 font-medium">Why it&apos;s genuine vs why it may be risky</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk Factors (Red / Rose) */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/90 space-y-3 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Risk & Fraud Indicators</span>
            </div>
            {negativeSignals.length === 0 ? (
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                ✨ No critical fraud triggers or deceptive price patterns detected.
              </p>
            ) : (
              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                {negativeSignals.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{s.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Trust Factors (Emerald) */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Trust & Legitimacy Indicators</span>
            </div>
            {positiveSignals.length === 0 ? (
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                ⚠️ Limited positive verification signals found for this listing.
              </p>
            ) : (
              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                {positiveSignals.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{s.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Discrete Points Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
            Auditable Mathematical Points Breakdown
          </h4>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {positiveSignals.length} Green Flags
            </span>
            <span className="flex items-center gap-1.5 text-rose-800 font-bold bg-rose-50 px-3 py-1 rounded-full border border-rose-200 shadow-sm">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> {negativeSignals.length} Red Flags
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Negative Signals Column */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-extrabold text-rose-600 tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Detected Risk Deductions
            </h5>
            {negativeSignals.map((signal, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover={{ y: -2, scale: 1.01 }}
                className="p-4 rounded-2xl bg-white border border-rose-200 space-y-1.5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-rose-950 capitalize">
                    {signal.name.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 flex-shrink-0">
                    -{(signal.strength * (signal.weight || 0.2) * 100).toFixed(1)} pts
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {signal.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Positive Signals Column */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Detected Trust Credits
            </h5>
            {positiveSignals.map((signal, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover={{ y: -2, scale: 1.01 }}
                className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-1.5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-emerald-950 capitalize">
                    {signal.name.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                    +{(signal.strength * (signal.weight || 0.2) * 100).toFixed(1)} pts
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {signal.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
