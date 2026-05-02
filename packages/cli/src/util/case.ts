export function pascalCase(s: string): string {
  return s
    .replace(/[-_./\s]+(\w)/g, (_m, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_m, c: string) => c.toUpperCase());
}

export function camelCase(s: string): string {
  const p = pascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function kebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s./]+/g, '-')
    .toLowerCase();
}

export function snakeCase(s: string): string {
  return kebabCase(s).replace(/-/g, '_');
}

export function pluralize(s: string): string {
  if (/(s|x|z|ch|sh)$/i.test(s)) return `${s}es`;
  if (/[^aeiou]y$/i.test(s)) return `${s.slice(0, -1)}ies`;
  return `${s}s`;
}
