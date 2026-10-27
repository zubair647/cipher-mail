// Holds the SendEngine for the campaign currently being sent, so the Confirm,
// Sending, and Summary screens share one instance (and one live queue).

import type { SendEngine } from './sendEngine';

let engine: SendEngine | null = null;

export function setActiveEngine(e: SendEngine | null) {
  engine = e;
}

export function getActiveEngine(): SendEngine | null {
  return engine;
}
