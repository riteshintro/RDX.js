export type ConfigData = Record<string, unknown>;

export class ConfigRepository {
  private data: ConfigData;

  constructor(data: ConfigData = {}) {
    this.data = { ...data };
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let cur: unknown = this.data;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return defaultValue as T;
      cur = (cur as Record<string, unknown>)[p];
    }
    return (cur === undefined ? defaultValue : cur) as T;
  }

  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let cur = this.data as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!;
      const next = cur[p];
      if (next == null || typeof next !== 'object' || Array.isArray(next)) {
        cur[p] = {};
      }
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]!] = value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  all(): ConfigData {
    return this.data;
  }

  merge(data: ConfigData): void {
    this.data = deepMerge(this.data, data);
  }
}

function deepMerge(a: ConfigData, b: ConfigData): ConfigData {
  const out: ConfigData = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (
      bv && typeof bv === 'object' && !Array.isArray(bv) &&
      av && typeof av === 'object' && !Array.isArray(av)
    ) {
      out[k] = deepMerge(av as ConfigData, bv as ConfigData);
    } else {
      out[k] = bv;
    }
  }
  return out;
}
