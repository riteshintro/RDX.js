import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

let loaded = false;

export function loadEnv(basePath?: string): void {
  if (loaded) return;
  const path = basePath ? resolve(basePath, '.env') : resolve(process.cwd(), '.env');
  loadDotenv({ path });
  loaded = true;
}

export function env(key: string): string | undefined;
export function env<T>(key: string, defaultValue: T): string | T;
export function env(key: string, defaultValue?: unknown): unknown {
  const v = process.env[key];
  if (v === undefined) return defaultValue;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v === '') return '';
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  return v;
}
