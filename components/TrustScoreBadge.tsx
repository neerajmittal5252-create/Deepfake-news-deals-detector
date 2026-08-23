'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import { VerdictBand } from '@/lib/types';
import { ShieldCheck, ShieldAlert, AlertTriangle, Sparkles, Award } from 'lucide-react';

interface TrustScoreBadgeProps {
  score: number;
  verdict: VerdictBand;
  moduleType: string;
}

function AnimatedScoreNumber({ target }: { target: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 65, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));
  const [val, setVal] = useState(0);

  useEffect(() => {
    spring.set(target);
    const unsubscribe = display.on('change', (latest) => setVal(latest));
    return () => unsubscribe();
  }, [target, spring, display]);

  return <span>{val}</span>;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score, verdict, moduleType }) => {
  const getTheme = () => {
    if (score < 45 || verdict === 'High Risk') {
      return {
        stroke: '#e11d48',
        track: '#ffe4e6',
        glow: 'rgba(225, 29, 72, 0.45)',
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
        icon: <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />,
        label: 'High Risk / Potential Fraud',
        sublabel: 'Severe risk patterns or deceptive price deviations detected.',
        accentText: 'text-rose-600',
        orbColor: 'rgba(244, 63, 94, 0.25)',
      };
    }
    if (score < 80 || verdict === 'Some Concerns') {
      return {
        stroke: '#f59e0b',
        track: '#fef3c7',
        glow: 'rgba(245, 158, 11, 0.45)',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        label: 'Some Concerns / Moderate Risk',
        sublabel: 'Unverified seller history or missing independent cross-checks.',
        accentText: 'text-amber-600',
        orbColor: 'rgba(245, 158, 11, 0.2)',
      };
    }
    return {
      stroke: '#10b981',
      track: '#d1fae5',
      glow: 'rgba(16, 185, 129, 0.45)',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      label: 'Verified / High Trust',
      sublabel: 'Passed multi-source price verification and reputable source checks.',
      accentText: 'text-emerald-600',
      orbColor: 'rgba(16, 185, 129, 0.2)',
    };
  };

  const theme = getTheme();
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  // Trigger celebration confetti if verified genuine
  useEffect(() => {
    if (score >= 80) {
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#f43f5e', '#10b981', '#fb7185', '#34d399', '#fecdd6'],
        });
      } catch {
        // gracefully ignore if canvas-confetti is unsupported
      }
    }
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-2xl border border-rose-100/90 shadow-2xl shadow-rose-900/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden"
    >
      {/* Dynamic Animated Background Aura */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.35, 0.6, 0.35],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: theme.orbColor }}
      />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full blur-3xl opacity-20 bg-rose-200 pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center gap-6 z-10 text-center sm:text-left">
        {/* Animated Radial Progress Gauge with Spring */}
        <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
          {/* Animated Glow Halo */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-2 rounded-full blur-md"
            style={{ backgroundColor: theme.glow }}
          />

          <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 144 144">
            {/* Background Track */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke={theme.track}
              strokeWidth="11"
              className="fill-none"
            />
            {/* Animated Dynamic Progress Arc */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              stroke={theme.stroke}
              strokeWidth="11"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              strokeLinecap="round"
              className="fill-none"
              style={{ filter: `drop-shadow(0 0 8px ${theme.glow})` }}
            />
          </svg>

          {/* Animated Counter in Center */}
          <div className="absolute flex flex-col items-center justify-center z-20">
            <span className={`text-4xl font-black tracking-tight ${theme.accentText}`}>
              <AnimatedScoreNumber target={score} />
            </span>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Score / 100
            </span>
          </div>
        </div>

        {/* Verdict Details */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm"
            >
              {moduleType.toUpperCase()} VERDICT
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`text-xs font-black px-3.5 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${theme.badgeBg}`}
            >
              {theme.icon}
              {verdict}
            </motion.span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
            {theme.label}
          </h2>
          <p className="text-sm text-slate-600 max-w-md leading-relaxed font-medium">
            {theme.sublabel}
          </p>
        </div>
      </div>

      {/* Right side metrics */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center md:items-end justify-center border-t md:border-t-0 md:border-l border-rose-100/90 pt-4 md:pt-0 md:pl-7 w-full md:w-auto text-center md:text-right z-10"
      >
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-spin-slow" />
          <span>Multi-Engine Corroboration</span>
        </div>
        <div className="text-xs text-slate-400 font-medium">Mathematical Baseline: 70/100</div>
        <div className="mt-2.5 text-xs font-extrabold text-rose-600 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200/90 shadow-sm flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          Bright Data + Agentic Engine
        </div>
      </motion.div>
    </motion.div>
  );
};
