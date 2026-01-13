import type { Schedule } from './types';
/**
 * Pure function to generate an 8-period playing time schedule
 *
 * Rules:
 * - 8 total periods (4 quarters with midpoint substitution)
 * - Target: 4 periods per player when roster allows
 * - If fewer players, distribute as evenly as possible
 * - Difference between most/least played periods should be ≤ 1 when feasible
 */
export declare function generateSchedule(playerIds: string[]): Schedule;
//# sourceMappingURL=scheduler.d.ts.map