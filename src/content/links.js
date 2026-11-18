// Every outside link the app shows. Faith Promise supplies these. Any link left as an empty
// string is hidden everywhere it would appear. Do not guess at URLs.

export const links = {
  // Pastoral care: where someone goes when they are in a hard place.
  care: 'https://www.faithpromise.org/care',
  // Finding and joining a group.
  groups: 'https://www.faithpromise.org/groups',
  // Serving teams (the Winning Team).
  serving: 'https://www.faithpromise.org/serve',
  // Online giving.
  giving: 'https://www.faithpromise.org/give',
  // Counseling referrals or the counseling ministry.
  counseling: '',
  // Financial coaching.
  financialCoaching: '',
};

export function hasLink(key) {
  return typeof links[key] === 'string' && links[key].startsWith('https://');
}
