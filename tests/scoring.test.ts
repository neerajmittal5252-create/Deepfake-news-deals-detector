import { describe, it, expect } from 'vitest';
import { computeScore, getVerdictBand, scoreModuleSignals } from '../lib/scoringEngine';
import { Signal } from '../lib/types';
import { detectModuleType } from '../lib/moduleRouter';

describe('Deterministic Scoring Engine (4.2 Spec Compliance)', () => {
  it('starts at baseline 70 for neutral state without signals', () => {
    const score = computeScore([], {});
    expect(score).toBe(70);
    expect(getVerdictBand(score)).toBe('Looks Genuine');
  });

  it('clamps score at maximum 100 for all positive signals', () => {
    const signals: Signal[] = [
      { name: 'price_deviation', direction: 'positive', strength: 1.0, description: 'Normal price' },
      { name: 'seller_pattern', direction: 'positive', strength: 1.0, description: 'Great history' },
      { name: 'red_flag_phrases', direction: 'positive', strength: 1.0, description: 'Clean text' },
      { name: 'data_completeness', direction: 'positive', strength: 1.0, description: 'Full data' },
      { name: 'account_age_proxy', direction: 'positive', strength: 1.0, description: 'Verified account' },
    ];
    const weights = {
      price_deviation: 0.35,
      seller_pattern: 0.25,
      red_flag_phrases: 0.20,
      data_completeness: 0.10,
      account_age_proxy: 0.10,
    };

    const score = computeScore(signals, weights);
    expect(score).toBe(100);
    expect(getVerdictBand(score)).toBe('Looks Genuine');
  });

  it('correctly drops to High Risk (<40) on multiple severe red flags', () => {
    const signals: Signal[] = [
      { name: 'price_deviation', direction: 'negative', strength: 0.9, description: 'Massive discount bait' },
      { name: 'seller_pattern', direction: 'negative', strength: 0.8, description: 'Duplicate scam listings' },
      { name: 'red_flag_phrases', direction: 'negative', strength: 1.0, description: 'Urgent wire transfer' },
    ];
    const weights = {
      price_deviation: 0.35,
      seller_pattern: 0.25,
      red_flag_phrases: 0.20,
    };

    const score = computeScore(signals, weights);
    // Baseline 70 - (0.9*35) - (0.8*25) - (1.0*20) = 70 - 31.5 - 20 - 20 = -1.5 -> clamped to 0 or low
    expect(score).toBeLessThan(40);
    expect(getVerdictBand(score)).toBe('High Risk');
  });

  it('correctly categorizes verdict thresholds', () => {
    expect(getVerdictBand(0)).toBe('High Risk');
    expect(getVerdictBand(39)).toBe('High Risk');
    expect(getVerdictBand(40)).toBe('Some Concerns');
    expect(getVerdictBand(69)).toBe('Some Concerns');
    expect(getVerdictBand(70)).toBe('Looks Genuine');
    expect(getVerdictBand(100)).toBe('Looks Genuine');
  });
});

describe('Module Router Detection (Section 8 Heuristic)', () => {
  it('detects plain text claim as news module', () => {
    expect(detectModuleType('NASA announces discovery of liquid water')).toBe('news');
  });

  it('detects classifieds and marketplace URLs as listing module', () => {
    expect(detectModuleType('https://www.olx.com/item/used-car-for-sale')).toBe('listing');
    expect(detectModuleType('https://craigslist.org/listing/iphone-14')).toBe('listing');
  });

  it('detects coupons and promo discount URLs as offer module', () => {
    expect(detectModuleType('https://coupon-aggregator.com/deal/nike-shoes')).toBe('offer');
    expect(detectModuleType('https://store.com/promo/summer-sale')).toBe('offer');
  });
});
