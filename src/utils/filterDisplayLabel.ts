export interface FilterLabelOption {
  id: string;
  name: string;
  displayName?: string;
}

// Mongo ObjectIds are normally hexadecimal; the broader 24-character guard
// also protects the UI from malformed legacy IDs without exposing them.
const mongoObjectIdPattern = /^[a-z\d]{24}$/i;

export function isMongoObjectId(value: string): boolean {
  return mongoObjectIdPattern.test(value.trim());
}

export function resolveFilterDisplayLabel(
  value: string,
  options: readonly FilterLabelOption[],
  loading: boolean,
  readableFallback?: string,
): string {
  if (loading) return 'Loading…';
  const match = options.find((option) => option.id === value);
  if (match?.displayName) return match.displayName;
  if (match?.name) return match.name;
  if (readableFallback && !isMongoObjectId(readableFallback)) return readableFallback;
  return 'Unavailable selection';
}
