export function brandName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
}
export function brandInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(word => Array.from(word)[0]).slice(0, 2).join('').toUpperCase() || 'B';
}
