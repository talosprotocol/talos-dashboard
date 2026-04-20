import en from './en.json';

/**
 * Simple t() helper for i18n
 * In a real app, this would be a hook or use a more robust library like next-intl or react-i18next
 */
export function t(path: string): string {
  const keys = path.split('.');
  let current: unknown = en;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

export default t;
