// Assessment content.
//
// Layer 1, Flourishing: the 20 v1 questions with their exact wording, order, 1 to 10 scale and
// database columns. Do not edit the `text` of these items. Saved v1 assessments must stay
// comparable with new ones.
//
// Layer 2, Habits: 16 items, one stem, answers stored as 0 to 4.

import { DIMENSION_ORDER } from './dimensions.js';

export const HARVARD_ATTRIBUTION =
  'Several questions are adapted from the Flourishing measure developed by the Human Flourishing Program at Harvard University (VanderWeele, 2017, PNAS 114(31):8148-8156), used under CC BY-NC 4.0. The wording and scale differ from the original, so these scores cannot be compared with published Harvard results.';

export const HARVARD_SOURCE_URL = 'https://hfh.fas.harvard.edu/measuring-flourishing';

const HARVARD = (item, note) => ({ type: 'harvard', item, note });
const FAITH_PROMISE = { type: 'faith-promise' };

export const FLOURISHING_SCALE = {
  min: 1,
  max: 10,
  lowLabel: 'Strongly disagree',
  highLabel: 'Strongly agree',
};

export const FLOURISHING_QUESTIONS = {
  faith: [
    {
      column: 'faith_q1',
      text: 'I believe the Bible is the ultimate authority for how I should live my life.',
      source: FAITH_PROMISE,
    },
    {
      column: 'faith_q2',
      text: 'I actively strive to put Jesus first in my decisions, schedule, and priorities.',
      source: FAITH_PROMISE,
    },
    {
      column: 'faith_q3',
      text: 'I regularly experience a sense of connection with God in my daily life, not just on Sundays.',
      source: FAITH_PROMISE,
    },
  ],
  relationships: [
    {
      column: 'relationships_q1',
      text: 'I am content with the quality and depth of my current friendships and family relationships.',
      source: HARVARD(9, 'Adapted from "I am content with my friendships and relationships."'),
    },
    {
      column: 'relationships_q2',
      text: 'I have a trusted circle of people who know my real struggles and encourage me to grow.',
      source: FAITH_PROMISE,
    },
    {
      column: 'relationships_q3',
      text: 'When conflict arises in my relationships, I take initiative to resolve it in a healthy way rather than ignoring it.',
      source: FAITH_PROMISE,
    },
  ],
  finances: [
    {
      column: 'finances_q1',
      text: 'I feel secure that my basic needs (food, housing, safety) are being met.',
      source: HARVARD(12, 'Adapted from the worry about safety, food or housing item; phrased positively, so the direction is reversed.'),
    },
    {
      column: 'finances_q2',
      text: 'I am free from dominating anxiety or overwhelming worry regarding my monthly expenses.',
      source: HARVARD(11, 'Adapted from the worry about monthly living expenses item; phrased positively, so the direction is reversed.'),
    },
    {
      column: 'finances_q3',
      text: 'I view my financial resources as a tool to do good and I find joy in being generous toward others.',
      source: FAITH_PROMISE,
    },
  ],
  health: [
    {
      column: 'health_q1',
      text: 'I have the physical energy and health needed to accomplish the things that matter most to me.',
      source: HARVARD(3, 'Adapted from the physical health rating.'),
    },
    {
      column: 'health_q2',
      text: "I generally feel emotionally resilient and capable of handling life's daily stressors.",
      source: HARVARD(4, 'Adapted from the mental health rating.'),
    },
  ],
  purpose: [
    {
      column: 'purpose_q1',
      text: 'Overall, I feel that the things I do in my life are worthwhile and contribute to a greater cause.',
      source: HARVARD(5, 'Adapted from the worthwhile activities item.'),
    },
    {
      column: 'purpose_q2',
      text: 'I have a clear sense of how my unique skills and gifts can be used to make a difference in the world.',
      source: HARVARD(6, 'Adapted from "I understand my purpose in life."'),
    },
    {
      column: 'purpose_q3',
      text: 'I am actively using my time and talents to serve others (in my home, work, or church).',
      source: FAITH_PROMISE,
    },
  ],
  character: [
    {
      column: 'character_q1',
      text: 'I consistently strive to do what is right, even in difficult or challenging situations.',
      source: HARVARD(7, 'Adapted from the promoting good item.'),
    },
    {
      column: 'character_q2',
      text: 'I am able to delay short-term pleasure or comfort in order to achieve greater long-term growth.',
      source: HARVARD(8, 'Adapted from the delayed gratification item.'),
    },
    {
      column: 'character_q3',
      text: 'My private thoughts and actions align with the person I present to others publicly (I am the same person in the dark as I am in the light).',
      source: FAITH_PROMISE,
    },
  ],
  contentment: [
    {
      column: 'contentment_q1',
      text: 'Overall, I am satisfied with my life as a whole these days.',
      source: HARVARD(1, 'Adapted from the life satisfaction item.'),
    },
    {
      column: 'contentment_q2',
      text: 'In general, I usually feel happy and at peace rather than discouraged or anxious.',
      source: HARVARD(2, 'Adapted from the happiness item.'),
    },
    {
      column: 'contentment_q3',
      text: 'I frequently find myself pausing to be thankful for what I have, rather than focusing on what I lack.',
      source: FAITH_PROMISE,
    },
  ],
};

export const FLOURISHING_COLUMNS = DIMENSION_ORDER.flatMap((d) => FLOURISHING_QUESTIONS[d].map((q) => q.column));

// Answers of 3 or below on these show a quiet care card on the results page.
export const CARE_COLUMNS = ['finances_q1', 'health_q2', 'contentment_q2'];
export const CARE_THRESHOLD = 3;

export const HABIT_STEM = 'Over the last month, how steady has this been for you?';

export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Not right now' },
  { value: 1, label: 'Once in a while' },
  { value: 2, label: 'About half the time' },
  { value: 3, label: 'Most of the time' },
  { value: 4, label: 'A steady rhythm' },
];

export const HABIT_ITEMS = {
  faith: [
    { key: 'faith_scripture', text: 'Reading or listening to Scripture', practice: 'scripture-reading' },
    { key: 'faith_prayer', text: 'Unhurried time in prayer', practice: 'prayer' },
    { key: 'faith_worship', text: 'Worshiping with my church on the weekend', practice: 'church-attendance' },
  ],
  relationships: [
    {
      key: 'relationships_group',
      text: 'Meeting with a group or a few friends who know what is going on in my life',
      practice: 'group-attendance',
    },
    {
      key: 'relationships_attention',
      text: 'Giving the people closest to me my full attention, with my phone put away',
      practice: 'phone-free-times',
    },
  ],
  finances: [
    { key: 'finances_giving', text: 'Giving to God first, before other spending', practice: 'tithing-giving' },
    { key: 'finances_plan', text: 'Following a written plan for my spending', practice: 'budgeting' },
  ],
  health: [
    { key: 'health_sleep', text: 'Getting enough sleep to feel rested', practice: 'sleep' },
    { key: 'health_movement', text: 'Moving my body for 30 minutes or more', practice: 'exercise' },
    { key: 'health_eating', text: 'Eating in a way that gives me energy', practice: 'nutrition' },
  ],
  purpose: [
    { key: 'purpose_serving', text: 'Serving someone with my time or skills', practice: 'serving' },
    {
      key: 'purpose_who_next',
      text: 'Praying for someone far from God, or taking a step toward a spiritual conversation',
      practice: 'evangelism',
    },
  ],
  character: [
    { key: 'character_memory', text: 'Memorizing or reviewing Scripture', practice: 'scripture-memory' },
    {
      key: 'character_confession',
      text: 'Being honest with God and one trusted person about where I fell short',
      practice: 'confession',
    },
  ],
  contentment: [
    { key: 'contentment_gratitude', text: 'Stopping to thank God for specific things', practice: 'gratitude' },
    { key: 'contentment_rest', text: 'Keeping a weekly day of rest', practice: 'sabbath' },
  ],
};

export const HABIT_KEYS = DIMENSION_ORDER.flatMap((d) => HABIT_ITEMS[d].map((h) => h.key));

export function habitItemForPractice(practiceKey) {
  for (const d of DIMENSION_ORDER) {
    const item = HABIT_ITEMS[d].find((h) => h.practice === practiceKey);
    if (item) return item;
  }
  return null;
}
