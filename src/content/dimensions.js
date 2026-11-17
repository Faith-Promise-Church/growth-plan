// The seven dimensions of whole-life flourishing.
// The "about" copy replaces the three interstitial slides from v1. It was rewritten for the
// v2 copy rules and is listed in docs/CONTENT_REVIEW.md.

export const DIMENSION_ORDER = [
  'faith',
  'relationships',
  'finances',
  'health',
  'purpose',
  'character',
  'contentment',
];

export const DIMENSIONS = {
  faith: {
    key: 'faith',
    name: 'Faith',
    definition:
      'Faith is about trusting the Bible as your guide, putting Jesus first in your choices, and staying connected with God every day.',
    whyItMatters:
      'You were made to know God. When that connection is strong, the rest of your life has something steady to hold on to.',
    growthFocus:
      'Grow here by building daily time in Scripture and prayer, bringing your decisions to Jesus, and worshiping with your church.',
  },
  relationships: {
    key: 'relationships',
    name: 'Relationships',
    definition:
      'Relationships is about the quality of your friendships and family ties, how honest you can be with others, and how connected you are to a community.',
    whyItMatters:
      'God made you for connection. Being alone for too long wears you down, and good friends help you through hard seasons.',
    growthFocus:
      'Grow here by spending time with people who know you well, giving the people closest to you your full attention, and working through conflict when it comes.',
  },
  finances: {
    key: 'finances',
    name: 'Finances',
    definition:
      'Finances is about how you manage what God has given you, how free you are from worry about money, and how generous you are with others.',
    whyItMatters:
      'Money stress takes up a lot of room in your mind. A healthy plan for your money gives you room to breathe and room to give.',
    growthFocus:
      'Grow here by making a spending plan you can keep, getting wise help with debt, and putting giving first.',
  },
  health: {
    key: 'health',
    name: 'Health',
    definition:
      'Health is about caring for your body and your mind so you have the energy to do what God has called you to do.',
    whyItMatters:
      'Your body carries you through every part of your life. When you are worn out, everything else gets harder.',
    growthFocus:
      'Grow here by building steady habits around sleep, movement and food, finding healthy ways to handle stress, and respecting the limits of your body.',
  },
  purpose: {
    key: 'purpose',
    name: 'Purpose',
    definition:
      'Purpose is about your sense of calling, using the gifts God gave you, and knowing that your life makes a difference.',
    whyItMatters:
      'People need more than comfort to thrive. Knowing why you are here helps you keep going when life is hard.',
    growthFocus:
      'Grow here by learning how God has wired you, trying new ways to serve others, and making room in your week for what God has asked you to do.',
  },
  character: {
    key: 'character',
    name: 'Character',
    definition:
      'Character is about your integrity, being the same person in private as you are in public, and choosing what is right over what is easy.',
    whyItMatters:
      'Talent can open doors, and character keeps them open. It holds your life together when pressure comes.',
    growthFocus:
      'Grow here by inviting God and trusted friends to point out your blind spots, keeping your word in small things, and building habits of honesty and self-control.',
  },
  contentment: {
    key: 'contentment',
    name: 'Contentment',
    definition:
      'Contentment is about how satisfied you are with your life, how often you give thanks, and whether your joy holds steady when things change.',
    whyItMatters:
      'Our culture always wants more. Contentment lets you enjoy the life God has given you today.',
    growthFocus:
      'Grow here by giving thanks every day, comparing yourself to others less, and finding your joy in God more than in what happens to you.',
  },
};

export function dimensionName(key) {
  return DIMENSIONS[key]?.name ?? key;
}

export function dimensionIcon(key, variant = 'standard') {
  const name = DIMENSIONS[key]?.name;
  return name ? `/assets/logos/${name}-${variant}.png` : '';
}

export function isDimension(key) {
  return Object.prototype.hasOwnProperty.call(DIMENSIONS, key);
}
