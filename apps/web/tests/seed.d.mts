export interface SeedRun{offers:string[][];chosen:number[];totals:(number|null)[];final:number|null;status?:'completed'|'in_progress'}
export interface SeedSpec{profile?:Record<string,unknown>;runs:SeedRun[]}
export const SLOW_RUNS:SeedSpec;
export function seededState(spec:SeedSpec):Record<string,unknown>;
