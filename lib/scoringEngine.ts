import { Signal, VerdictBand, ScoredResult, ModuleType } from './types';
import weightsConfig from '../config/scoring-weights.json';

/**
 * Computes deterministic 0-100 Trust Score based on signals and weights.
 * 
 * Formula:
 * Start at baseline 70 (neutral-leaning-positive, since absence of evidence isn't evidence of guilt).
 * For each signal with defined weight:
 *   score += (direction === 'negative' ? -1 : 1) * strength * weight * 100
 * Clamped strictly to [0, 100].
 */
export function computeScore(signals: Signal[], weights: Record<string, number>): number {
  let score = 70.0;

  for (const signal of signals) {
    const weight = weights[signal.name] ?? 0.1;
    const impact = (signal.direction === 'negative' ? -1 : 1) * signal.strength * weight * 100;
    score += impact;
  }

  const rounded = Math.round(score);
  return Math.max(0, Math.min(100, rounded));
}

/**
 * Categorizes score into auditable verdict bands:
 * - <40: High Risk
 * - 40–69: Some Concerns
 * - 70+: Looks Genuine
 */
export function getVerdictBand(score: number): VerdictBand {
  if (score < 40) return 'High Risk';
  if (score < 70) return 'Some Concerns';
  return 'Looks Genuine';
}

/**
 * High-level scoring runner for a specific module
 */
export function scoreModuleSignals(moduleType: ModuleType, signals: Signal[]): ScoredResult {
  const moduleWeights = (weightsConfig as Record<string, Record<string, number>>)[moduleType] || {};
  
  // Attach assigned weight to signal for transparency in UI
  const weightedSignals = signals.map(s => ({
    ...s,
    weight: moduleWeights[s.name] ?? 0.1
  }));

  const score = computeScore(weightedSignals, moduleWeights);
  const verdict = getVerdictBand(score);

  return {
    score,
    verdict,
    signals: weightedSignals,
    weightsUsed: moduleWeights,
  };
}
