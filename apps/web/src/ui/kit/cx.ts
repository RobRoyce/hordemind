/** Joins class names, skipping empty parts. */
export const cx=(...parts:(string|false|null|undefined)[])=>parts.filter(Boolean).join(' ');
