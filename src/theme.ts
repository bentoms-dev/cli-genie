import { styleText } from 'node:util';
import type { GenieTheme } from './types.js';

export const genieTheme: GenieTheme = {
  prefix: {
    idle: styleText('magenta', '🧞'),
    done: styleText('green', '✔'),
  },
  style: {
    highlight: (text: string) => styleText(['magenta', 'bold'], text),
    answer: (text: string) => styleText('cyan', text),
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeThemes(...themes: Array<GenieTheme | undefined>): GenieTheme | undefined {
  let result: GenieTheme | undefined;
  for (const theme of themes) {
    if (!theme) continue;
    result = result ? deepMerge(result, theme) : { ...theme };
  }
  return result;
}

function deepMerge(base: GenieTheme, override: GenieTheme): GenieTheme {
  const out: GenieTheme = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}
