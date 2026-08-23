'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleType } from '@/lib/types';
import { ShoppingBag, Tag, Newspaper, Search, Sparkles, ArrowRight, Zap, Loader2 } from 'lucide-react';

interface UrlInputProps {
  input: string;
  setInput: (val: string) => void;
  selectedModule: ModuleType;
  setSelectedModule: (mod: ModuleType) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const samplePresets: Record<
  ModuleType,
  Array<{ label: string; url: string; badge: 'Fake / Scam' | 'Verified / Genuine' }>
> = {
  listing: [
    {
      label: 'GameLoot: OnePlus Nord CE4 Lite (Used)',
      url: 'https://sell.gameloot.in/shop/oneplus-nord-ce4-lite-5g-8gb-ram-128gb-storage-color/',
      badge: 'Verified / Genuine',
    },
    {
      label: 'Twasa: ₹1 Retinol Serum Flash Trap',
      url: 'https://www.twasa.com/products/retinol-face-serum',
      badge: 'Fake / Scam',
    },
    {
      label: 'Suspicious iPhone 15 Pro ($250, Wire)',
      url: 'https://classifieds-market.com/listing/iphone-15-pro-max-250-urgent-sale-scam',
      badge: 'Fake / Scam',
    },
  ],
  offer: [
    {
      label: 'Fake 99% Off Nike Flash Deal (Phishing)',
      url: 'https://secret-deals-promo.xyz/offer/nike-air-jordan-99-off-deal',
      badge: 'Fake / Scam',
    },
    {
      label: 'Verified Nike Member 25% Off Promo',
      url: 'https://nike.com/promotions/summer-member-sale-25-off',
      badge: 'Verified / Genuine',
    },
  ],
  news: [
    {
      label: 'Fake: "Secret Microchips in Bottled Water"',
      url: 'Scientists reveal secret microchips found in bottled water worldwide to track citizens',
      badge: 'Fake / Scam',
    },
    {
      label: 'Reuters: NASA Webb Cosmic Discovery',
      url: 'https://www.reuters.com/technology/space/nasas-webb-telescope-reveals-origins-bright-early-galaxies-2024-05-30/',
      badge: 'Verified / Genuine',
    },
  ],
};

const moduleTabs: Array<{ id: ModuleType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'listing', label: 'Marketplace Listing', icon: ShoppingBag },
  { id: 'offer', label: 'Offer / Deal', icon: Tag },
  { id: 'news', label: 'News / Claim', icon: Newspaper },
];

export const UrlInput: React.FC<UrlInputProps> = ({
  input,
  setInput,
  selectedModule,
  setSelectedModule,
  onSubmit,
  isLoading,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Module Selector with Framer Motion Sliding Active Pill */}
      <div className="relative flex p-1.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl shadow-sm backdrop-blur-md">
        {moduleTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedModule === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedModule(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold transition-colors z-10 ${
                isSelected ? 'text-white' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeModuleTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 rounded-xl shadow-md shadow-rose-500/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Input Box with Animated Glowing Scanner */}
      <div className="relative group">
        {/* Animated Background Aura */}
        <motion.div
          animate={{
            opacity: isLoading ? [0.4, 0.9, 0.4] : [0.2, 0.5, 0.2],
            scale: isLoading ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-1 bg-gradient-to-r from-rose-400 via-pink-400 to-red-500 rounded-3xl blur-md pointer-events-none"
        />

        <div className="relative flex items-center bg-white border border-rose-200 rounded-2xl shadow-xl shadow-rose-900/5 p-2 transition-all overflow-hidden">
          {/* Scanning Laser Wave Animation while Loading */}
          {isLoading && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
              className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-rose-400/25 to-transparent pointer-events-none"
            />
          )}

          <div className="pl-4 pr-3 text-rose-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedModule === 'listing'
                ? 'Paste marketplace URL (e.g. GameLoot, OLX, eBay product link)...'
                : selectedModule === 'offer'
                ? 'Paste promotional offer/deal/coupon page URL...'
                : 'Paste news article URL or enter any text claim directly...'
            }
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm md:text-base font-medium focus:outline-none py-2.5 z-10"
          />

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSubmit}
            disabled={isLoading || !input.trim()}
            className="relative z-10 py-3 px-7 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span>Auditing...</span>
              </div>
            ) : (
              <>
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Preset Chips with Stagger Animation */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          <Zap className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span className="uppercase tracking-wider">Quick 1-Click Demo Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <AnimatePresence mode="popLayout">
            {samplePresets[selectedModule].map((preset, idx) => (
              <motion.button
                key={`${selectedModule}-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setInput(preset.url)}
                className="group/chip px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50/80 border border-slate-200 hover:border-rose-300 text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm hover:shadow-md transition-all text-left"
              >
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                    preset.badge === 'Fake / Scam'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {preset.badge}
                </span>
                <span className="truncate max-w-xs group-hover/chip:text-rose-600 transition-colors">
                  {preset.label}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
