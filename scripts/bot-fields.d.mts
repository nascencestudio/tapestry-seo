import type { CategoryId, Respects } from '../src/bots.js';

export function plain(value: unknown): string;
export function operatorFor(value: unknown, name?: string): string;
export function categoryFor(fn: unknown, name?: string): CategoryId;
export function respectsFor(value: unknown): Respects;
