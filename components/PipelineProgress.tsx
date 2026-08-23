'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Cpu, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

interface PipelineProgressProps {
  isLoading: boolean;
  moduleType: string;
}

const steps = [
  {
    id: 1,
    title: 'Bright Data Extraction',
    description: 'Live Web Unlocker parses DOM & bypasses anti-bot',
    icon: Database,
  },
  {
    id: 2,
    title: 'Multi-Engine Cross-Check',
    description: 'Querying DuckDuckGo, Google SERP & Fact-Checks',
    icon: Search,
  },
  {
    id: 3,
    title: 'Deterministic Signal Math',
    description: 'Calculating mathematical red/green flag deductions',
    icon: Cpu,
  },
  {
    id: 4,
    title: 'Agentic LLM Synthesis',
    description: 'Auditing merchant signals & synthesizing factual verdict',
    icon: Sparkles,
  },
];

export const PipelineProgress: React.FC<PipelineProgressProps> = ({ isLoading, moduleType }) => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(1);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full p-6 sm:p-7 rounded-3xl bg-white border border-rose-200 shadow-2xl shadow-rose-900/10 space-y-6 relative overflow-hidden"
    >
      {/* Animated Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-rose-100 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-red-600"
          initial={{ width: '15%' }}
          animate={{ width: `${(currentStep / 4) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex items-center justify-between border-b border-rose-100 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200">
            <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          </div>
          <div>
            <span className="font-black text-sm text-slate-900 font-heading">
              Executing Verification Pipeline for {moduleType.toUpperCase()}
            </span>
            <p className="text-xs text-slate-500 font-medium">
              Bright Data Unlocker + Live Web Tools + AI Audit
            </p>
          </div>
        </div>
        <span className="text-xs font-black text-rose-700 bg-rose-50 px-3.5 py-1 rounded-full border border-rose-200 shadow-sm">
          Stage {currentStep} of 4
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step.id * 0.08 }}
              className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-rose-50/90 border-rose-400 shadow-lg shadow-rose-500/15 scale-[1.03]'
                  : isDone
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}
            >
              {isCurrent && (
                <span className="absolute inset-0 rounded-2xl border-2 border-rose-400 animate-pulse pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                    isCurrent
                      ? 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isCurrent && <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />}
              </div>
              <h4 className="text-xs font-black text-slate-800">{step.title}</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">
                {step.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
