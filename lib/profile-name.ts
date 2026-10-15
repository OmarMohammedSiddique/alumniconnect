export function formatFullName(value: string): string {
  return value
    .trim()
    .replace(/\s+/gu, " ")
    // Uppercase initials without flattening intentional casing such as McDonald.
    .replace(/(^|[\s\p{Pd}'’])(\p{Ll})/gu, (_match, separator: string, initial: string) =>
      separator + initial.toUpperCase(),
    );
}
