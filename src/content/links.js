// Every outside link the app shows. Faith Promise supplies these. Any link left as an empty
// string is hidden everywhere it would appear. Do not guess at URLs.

export const links = {
  // Pastoral care: where someone goes when they are in a hard place.
  care: '',
  // Finding and joining a group.
  groups: '',
  // Serving teams (the Winning Team).
  serving: '',
  // Online giving.
  giving: '',
  // Counseling referrals or the counseling ministry.
  counseling: '',
  // Financial coaching.
  financialCoaching: '',
};

export function hasLink(key) {
  return typeof links[key] === 'string' && links[key].startsWith('https://');
}
