// Growth Plan Builder - Dimension Data Configuration

export const DIMENSIONS = {
  faith: {
    name: 'Faith',
    color: '#d66b4a',
    colorDark: '#c74c26',
    order: 1,
    questionsCount: 3,
    definition: 'your alignment with Biblical authority, your daily prioritization of following and becoming like Jesus, and the depth of your connection with God.',
    essential: 'Humans were created for relationship with their Creator; without this vertical anchor, all horizontal aspects of life eventually drift.',
    growthFocus: 'Building consistent rhythms of Scripture and prayer, intentionally surrendering daily decisions to Jesus, and engaging in worship and community environments that stretch your trust in God.',
    introStatement: "Let's get started by assessing the first aspect of whole-life flourishing -",
    mandatoryGoals: ['Scripture Reading', 'Prayer', 'Church Attendance'],
    suggestedGoals: ['Fasting', 'Journaling', 'Personal Worship', 'Bible Reading Plan', 'Listening Prayer'],
    questions: [
      'I believe the Bible is the ultimate authority for how I should live my life.',
      'I actively strive to put Jesus first in my decisions, schedule, and priorities.',
      'I regularly experience a sense of connection with God in my daily life, not just on Sundays.'
    ]
  },
  relationships: {
    name: 'Relationships',
    color: '#e69c5a',
    colorDark: '#e67e21',
    order: 2,
    questionsCount: 3,
    definition: 'the quality of your social connections, the depth of your vulnerability with others, and your integration into community.',
    essential: 'We are hardwired for connection; isolation is biologically and spiritually corrosive, while authentic community acts as a buffer against life\'s storms.',
    growthFocus: 'Moving from surface-level interactions to intentional, vulnerable connections, prioritizing time with life-giving people, and learning to practice healthy communication, forgiveness, and reconciliation.',
    introStatement: 'Great! Now on to the next step: measuring your happiness with your',
    mandatoryGoals: ['Group Attendance'],
    suggestedGoals: ['Scheduled Family/Friend Nights', 'Scheduled Date Nights', 'Mentoring Relationship', 'Missional Relationship Building', 'Phone-Free Times', 'Reconciliation'],
    questions: [
      'I am content with the quality and depth of my current friendships and family relationships.',
      'I have a trusted circle of people who know my real struggles and encourage me to grow.',
      'When conflict arises in my relationships, I take initiative to resolve it in a healthy way rather than ignoring it.'
    ]
  },
  finances: {
    name: 'Finances',
    color: '#dfbd60',
    colorDark: '#dcac2a',
    order: 3,
    questionsCount: 3,
    definition: 'your management of resources, freedom from scarcity-based anxiety, and your capacity for joyful, Kingdom-minded generosity.',
    essential: 'Financial stress creates a "scarcity tunnel" that consumes mental bandwidth, whereas financial health unlocks the ability to bless others.',
    growthFocus: 'Creating a clear, realistic spending plan, addressing debt or instability with wise counsel, and taking bold, practical steps toward open-handed generosity and a Jesus first mindset on money.',
    introStatement: "Awesome! Now, let's move on to the third set of questions, all about",
    mandatoryGoals: ['Tithing + Giving', 'Budgeting'],
    suggestedGoals: ['Emergency Savings/Margin Building', 'Financial Coaching', 'Debt Reduction', 'Charitable Giving (outside church)', 'Simplifying/Donating'],
    questions: [
      'I feel secure that my basic needs (food, housing, safety) are being met.',
      'I am free from dominating anxiety or overwhelming worry regarding my monthly expenses.',
      'I view my financial resources as a tool to do good and I find joy in being generous toward others.'
    ]
  },
  health: {
    name: 'Health',
    color: '#83a672',
    colorDark: '#6a8d58',
    order: 4,
    questionsCount: 2,
    definition: 'your care for the physical body and level of emotional/mental resilience, ensuring you possess the energy required to fulfill your God-given purpose.',
    essential: 'The body is the vehicle through which we execute our mission; if the vehicle breaks down, the mission is compromised.',
    growthFocus: 'Establishing sustainable habits around sleep, movement, and nutrition, addressing mental and emotional stress in healthy ways, and honoring God by listening to and caring for the limits of your body.',
    introStatement: "You're almost halfway there! Now let's briefly assess your",
    mandatoryGoals: ['Sleep', 'Exercise', 'Nutrition'],
    suggestedGoals: ['Healthy Weight Management', 'Therapy/Counseling', 'Screen Time Reduction', 'Healthy Hobbies', 'Medical Checkups'],
    questions: [
      'I have the physical energy and health needed to accomplish the things that matter most to me.',
      'I generally feel emotionally resilient and capable of handling life\'s daily stressors.'
    ]
  },
  purpose: {
    name: 'Purpose',
    color: '#409083',
    colorDark: '#377e72',
    order: 5,
    questionsCount: 3,
    definition: 'your sense of calling and Gospel mission, the utilization of your unique spiritual gifts, and the belief that your life contributes to a greater good.',
    essential: 'Humans cannot thrive on comfort alone; we require a "why" to endure the "how" and to feel that our existence matters.',
    growthFocus: 'Clarifying your God-given wiring and story, experimenting with ways to serve others using your gifts, and aligning your daily schedule with the callings and assignments God has placed on your life.',
    introStatement: 'Alright. Now let\'s evaluate how you are doing in the area of',
    mandatoryGoals: ['Serving', 'Evangelism'],
    suggestedGoals: ['Spiritual Gifts Assessment', 'Mentorship', 'Rule of Life', 'Books/Audiobooks', 'Podcasts'],
    questions: [
      'Overall, I feel that the things I do in my life are worthwhile and contribute to a greater cause.',
      'I have a clear sense of how my unique skills and gifts can be used to make a difference in the world.',
      'I am actively using my time and talents to serve others (in my home, work, or church).'
    ]
  },
  character: {
    name: 'Character',
    color: '#326565',
    colorDark: '#2d5b5b',
    order: 6,
    questionsCount: 3,
    definition: 'your integrity, the alignment between your public and private self, and your ability to delay gratification for long-term growth.',
    essential: 'While talent may open doors, only character keeps them open; it is the structural integrity that prevents life from collapsing under pressure.',
    growthFocus: 'Inviting God and trusted people to speak into your blind spots, practicing integrity in small daily choices, and building disciplines that strengthen self-control, honesty, and humility over time.',
    introStatement: "Getting close. Let's take a look at the strength of your",
    mandatoryGoals: ['Scripture Memory', 'Daily Confession & Repentance'],
    suggestedGoals: ['Accountability Relationships', 'Internet Boundaries', 'Media Boundaries', 'Social Media Boundaries'],
    questions: [
      'I consistently strive to do what is right, even in difficult or challenging situations.',
      'I am able to delay short-term pleasure or comfort in order to achieve greater long-term growth.',
      'My private thoughts and actions align with the person I present to others publicly (I am the same person in the dark as I am in the light).'
    ]
  },
  contentment: {
    name: 'Contentment',
    color: '#283d49',
    colorDark: '#243742',
    order: 7,
    questionsCount: 3,
    definition: 'your overall satisfaction with life, your practice of gratitude, and your ability to maintain joy regardless of external circumstances.',
    essential: 'It is the antidote to the toxic culture of "more," allowing you to actually enjoy the life God has given you right now.',
    growthFocus: 'Cultivating daily gratitude, limiting comparison and envy, and learning to anchor your joy in God\'s presence and promises rather than in changing circumstances or achievements.',
    introStatement: 'Last one but not least – let\'s get a measure of your',
    mandatoryGoals: ['Gratitude', 'Weekly Sabbath'],
    suggestedGoals: ['Silence and Solitude', 'Scripture Meditation', 'Decluttering/Living Simply', 'Community Service', 'Media/Social Media Fasting'],
    questions: [
      'Overall, I am satisfied with my life as a whole these days.',
      'In general, I usually feel happy and at peace rather than discouraged or anxious.',
      'I frequently find myself pausing to be thankful for what I have, rather than focusing on what I lack.'
    ]
  }
};

// Ordered array of dimension keys for sequential navigation
export const DIMENSION_ORDER = ['faith', 'relationships', 'finances', 'health', 'purpose', 'character', 'contentment'];

// Helper function to get encouragement message based on score
export function getEncouragementMessage(score) {
  const numScore = parseFloat(score);
  if (numScore >= 1.0 && numScore <= 5.0) {
    return "Let's make a plan to grow!";
  } else if (numScore >= 5.1 && numScore <= 7.4) {
    return "Keep working on it, you got this!";
  } else if (numScore >= 7.5 && numScore <= 9.0) {
    return "Let's go to the next level!";
  } else if (numScore >= 9.1 && numScore <= 10.0) {
    return "You're crushing it!";
  }
  return "";
}

// Helper function to get logo path
export function getDimensionLogo(dimension, variant = 'standard') {
  const name = DIMENSIONS[dimension]?.name || dimension;
  return `/assets/logos/${name}-${variant}.png`;
}

// Calculate average score for a dimension
export function calculateDimensionScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const sum = responses.reduce((acc, val) => acc + val, 0);
  return (sum / responses.length).toFixed(1);
}
