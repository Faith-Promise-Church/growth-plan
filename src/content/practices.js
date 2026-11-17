// Practice library. Seeded from the v1 mandatoryGoals (now "core" practices) and
// suggestedGoals in dimensionData.js. Every sentence here is a draft for review and is listed in
// docs/CONTENT_REVIEW.md.
//
// Each starter is { what, cadence, cadenceText? }. The habit sentence is built by
// composeHabitSentence() in src/lib/habits.js, for example
//   { what: 'Read one Psalm before I pick up my phone', cadence: 'weekdays' }
//   -> "Read one Psalm before I pick up my phone on weekdays."

const s = (what, cadence, cadenceText) => (cadenceText ? { what, cadence, cadenceText } : { what, cadence });

function practice(key, dimension, name, fields) {
  return {
    key,
    dimension,
    name,
    core: false,
    support: false,
    habitItem: null,
    legacyNames: [],
    ...fields,
  };
}

export const PRACTICES = [
  // Faith
  practice('scripture-reading', 'faith', 'Scripture reading', {
    core: true,
    habitItem: 'faith_scripture',
    legacyNames: ['Scripture Reading'],
    why: "Time in God's Word shapes how you think and what you love.",
    small: s('Read one Psalm before I pick up my phone', 'weekdays'),
    steady: s('Read one chapter of the Bible each morning', 'daily'),
    stretch: s('Read two chapters and write down one thing to put into practice', 'daily'),
  }),
  practice('prayer', 'faith', 'Prayer', {
    core: true,
    habitItem: 'faith_prayer',
    legacyNames: ['Prayer'],
    why: 'Prayer is how your friendship with God grows.',
    small: s('Pray for five minutes before I start my day', 'weekdays'),
    steady: s('Spend ten minutes in prayer with a short list of people and needs', 'daily'),
    stretch: s('Spend twenty unhurried minutes in prayer, with time to listen', 'daily'),
  }),
  practice('church-attendance', 'faith', 'Weekend worship', {
    core: true,
    habitItem: 'faith_worship',
    legacyNames: ['Church Attendance'],
    why: 'Worshiping with your church family keeps you anchored and known.',
    small: s('Worship with my church in person or online', 'other', 'twice a month'),
    steady: s('Worship with my church in person', 'weekly'),
    stretch: s('Worship with my church and welcome someone new', 'weekly'),
  }),
  practice('fasting', 'faith', 'Fasting', {
    legacyNames: ['Fasting'],
    why: 'Going without food for a time helps you depend on God.',
    small: s('Skip one meal and use that time to pray', 'monthly'),
    steady: s('Skip one meal and use that time to pray', 'weekly'),
    stretch: s('Fast for a full day and spend meal times in prayer', 'monthly'),
  }),
  practice('journaling', 'faith', 'Journaling', {
    legacyNames: ['Journaling'],
    why: 'Writing your prayers and thoughts helps you notice what God is doing.',
    small: s('Write a few lines about what God is teaching me', 'weekly'),
    steady: s('Write a few lines about what God is teaching me', 'few-weekly'),
    stretch: s('Write my prayers and one takeaway from Scripture', 'daily'),
  }),
  practice('personal-worship', 'faith', 'Personal worship', {
    legacyNames: ['Personal Worship'],
    why: 'Worship belongs in your week as well as on the weekend.',
    small: s('Listen to one worship song and pray it back to God', 'few-weekly'),
    steady: s('Start my day with a worship song', 'daily'),
    stretch: s('Spend fifteen minutes in worship and prayer at home', 'daily'),
  }),
  practice('bible-reading-plan', 'faith', 'Bible reading plan', {
    legacyNames: ['Bible Reading Plan'],
    why: 'A plan helps you keep going on the days you do not feel like it.',
    small: s('Follow a short Bible reading plan', 'weekdays'),
    steady: s('Follow a one-year Bible reading plan', 'daily'),
    stretch: s('Follow a one-year plan and talk about it with a friend each week', 'daily'),
  }),
  practice('listening-prayer', 'faith', 'Listening prayer', {
    legacyNames: ['Listening Prayer'],
    why: 'Prayer is a conversation, so it includes time to listen.',
    small: s('Sit in silence for five minutes and ask God to speak', 'weekly'),
    steady: s('Sit in silence for ten minutes and ask God to speak', 'few-weekly'),
    stretch: s('Sit in silence for ten minutes and write down what I sense', 'daily'),
  }),
  practice('faith-pastor-conversation', 'faith', 'Talk with a pastor', {
    support: true,
    why: 'You do not have to carry a hard season alone.',
    small: s('Ask a pastor or group leader for a time to talk', 'other', 'this month'),
    steady: s('Meet with a pastor or mentor', 'monthly'),
    stretch: s('Meet with a pastor or mentor and pray together', 'monthly'),
  }),

  // Relationships
  practice('group-attendance', 'relationships', 'Group', {
    core: true,
    support: true,
    habitItem: 'relationships_group',
    legacyNames: ['Group Attendance'],
    why: 'You grow best with a few people who know what is going on in your life.',
    small: s('Meet with my group', 'other', 'twice a month'),
    steady: s('Meet with my group', 'weekly'),
    stretch: s('Meet with my group and get together with one person from it outside of group', 'weekly'),
  }),
  practice('phone-free-times', 'relationships', 'Phone-free time', {
    habitItem: 'relationships_attention',
    legacyNames: ['Phone-Free Times'],
    why: 'Your full attention tells people they matter to you.',
    small: s('Put my phone in another room during one family meal', 'weekly'),
    steady: s('Keep my phone away during dinner', 'daily'),
    stretch: s('Keep my phone away from dinner until bedtime', 'daily'),
  }),
  practice('family-nights', 'relationships', 'Family and friend nights', {
    legacyNames: ['Scheduled Family/Friend Nights'],
    why: 'Shared time builds strong families and friendships.',
    small: s('Plan one night with family or friends', 'monthly'),
    steady: s('Plan one night with family or friends', 'weekly'),
    stretch: s('Plan a night with family or friends and take turns choosing what we do', 'weekly'),
  }),
  practice('date-nights', 'relationships', 'Date nights', {
    legacyNames: ['Scheduled Date Nights'],
    why: 'A marriage grows when you make time for it.',
    small: s('Plan a date with my spouse', 'monthly'),
    steady: s('Plan a date with my spouse', 'other', 'twice a month'),
    stretch: s('Plan a date with my spouse', 'weekly'),
  }),
  practice('mentoring', 'relationships', 'Mentoring', {
    legacyNames: ['Mentoring Relationship'],
    why: 'Learning from someone further along helps you grow.',
    small: s('Ask someone I respect to meet for coffee', 'other', 'this month'),
    steady: s('Meet with a mentor', 'monthly'),
    stretch: s('Meet with a mentor and meet with someone I can encourage', 'monthly'),
  }),
  practice('missional-relationships', 'relationships', 'Friends far from God', {
    legacyNames: ['Missional Relationship Building'],
    why: 'Most people first hear about Jesus from a friend.',
    small: s('Invite a neighbor or coworker for a meal', 'monthly'),
    steady: s('Spend time with a friend who does not know Jesus', 'other', 'twice a month'),
    stretch: s('Spend time with a friend who does not know Jesus', 'weekly'),
  }),
  practice('reconciliation', 'relationships', 'Reconciliation', {
    legacyNames: ['Reconciliation'],
    why: 'Conflict that is left alone weighs on you and the people you love.',
    small: s('Pray for one person I am in conflict with', 'daily'),
    steady: s('Reach out to one person to start making things right', 'other', 'this month'),
    stretch: s('Have an honest conversation to make things right, with help from a pastor if I need it', 'other', 'this month'),
  }),
  practice('relationship-counseling', 'relationships', 'Counseling for a relationship', {
    support: true,
    why: 'A counselor can help when a relationship feels stuck.',
    small: s('Reach out to schedule a counseling appointment', 'other', 'this month'),
    steady: s('Meet with a counselor', 'other', 'twice a month'),
    stretch: s('Meet with a counselor', 'weekly'),
  }),

  // Finances
  practice('tithing-giving', 'finances', 'Giving', {
    core: true,
    habitItem: 'finances_giving',
    legacyNames: ['Tithing + Giving'],
    why: 'Giving first reminds you that everything you have comes from God.',
    small: s('Set up a gift to my church', 'monthly'),
    steady: s('Give a set percentage to my church before other spending', 'other', 'each payday'),
    stretch: s('Give a tithe first and set aside a gift for a need I see', 'other', 'each payday'),
  }),
  practice('budgeting', 'finances', 'Spending plan', {
    core: true,
    habitItem: 'finances_plan',
    legacyNames: ['Budgeting'],
    why: 'A written plan tells your money where to go, so you worry less.',
    small: s('Write a simple spending plan before the month begins', 'monthly'),
    steady: s('Check my spending against my plan', 'weekly'),
    stretch: s('Review my spending plan with my spouse or a friend', 'weekly'),
  }),
  practice('emergency-savings', 'finances', 'Emergency savings', {
    legacyNames: ['Emergency Savings/Margin Building'],
    why: 'Savings turn emergencies into inconveniences.',
    small: s('Set aside a small amount in savings', 'other', 'each payday'),
    steady: s('Set aside a set amount in savings', 'other', 'each payday'),
    stretch: s('Add to savings until I have one month of expenses set aside', 'other', 'each payday'),
  }),
  practice('financial-coaching', 'finances', 'Financial coaching', {
    support: true,
    legacyNames: ['Financial Coaching'],
    why: 'A coach can help you make a plan and stay with it.',
    small: s('Ask about financial coaching at church', 'other', 'this month'),
    steady: s('Meet with a financial coach', 'monthly'),
    stretch: s('Meet with a financial coach and follow the plan we make', 'monthly'),
  }),
  practice('debt-reduction', 'finances', 'Paying down debt', {
    legacyNames: ['Debt Reduction'],
    why: 'Paying down debt gives you freedom to say yes to God.',
    small: s('Pay a little extra on my smallest debt', 'monthly'),
    steady: s('Put extra money toward one debt at a time', 'monthly'),
    stretch: s('Track my payoff plan and put every extra dollar toward debt', 'weekly'),
  }),
  practice('charitable-giving', 'finances', 'Giving beyond church', {
    legacyNames: ['Charitable Giving (outside church)'],
    why: 'Generosity grows when you look for needs around you.',
    small: s('Give to one need outside our church', 'other', 'this season'),
    steady: s('Give to a cause I care about', 'monthly'),
    stretch: s('Give to a cause I care about and serve there', 'monthly'),
  }),
  practice('simplifying', 'finances', 'Simplifying', {
    legacyNames: ['Simplifying/Donating'],
    why: 'Owning less can bring more peace.',
    small: s('Give away one bag of things I do not use', 'monthly'),
    steady: s('Clear out one space and donate what I do not need', 'weekly'),
    stretch: s('Buy nothing I do not need for a month', 'other', 'this month'),
  }),

  // Health
  practice('sleep', 'health', 'Sleep', {
    core: true,
    habitItem: 'health_sleep',
    legacyNames: ['Sleep'],
    why: 'Rest is how God made your body to recover.',
    small: s('Put my phone away thirty minutes before bed', 'weekdays'),
    steady: s('Go to bed at the same time each night', 'daily'),
    stretch: s('Keep a set bedtime and wake time so I get seven to eight hours of sleep', 'daily'),
  }),
  practice('exercise', 'health', 'Movement', {
    core: true,
    habitItem: 'health_movement',
    legacyNames: ['Exercise'],
    why: 'Moving your body gives you energy for what matters.',
    small: s('Take a fifteen-minute walk', 'few-weekly'),
    steady: s('Move my body for thirty minutes', 'few-weekly'),
    stretch: s('Move my body for thirty minutes or more', 'daily'),
  }),
  practice('nutrition', 'health', 'Eating well', {
    core: true,
    habitItem: 'health_eating',
    legacyNames: ['Nutrition'],
    why: 'What you eat affects your energy and your mood.',
    small: s('Drink a glass of water with every meal', 'daily'),
    steady: s('Plan my meals for the week', 'weekly'),
    stretch: s('Plan my meals and cook at home most nights', 'weekly'),
  }),
  practice('healthy-weight', 'health', 'A healthy goal with my doctor', {
    legacyNames: ['Healthy Weight Management'],
    why: 'Small, steady changes add up, and a doctor can help you choose the right ones.',
    small: s('Talk with my doctor about one healthy goal', 'other', 'this season'),
    steady: s('Take one step toward the goal my doctor and I set', 'weekly'),
    stretch: s('Take one step toward our goal and check in with a friend about it', 'weekly'),
  }),
  practice('counseling', 'health', 'Counseling', {
    support: true,
    legacyNames: ['Therapy/Counseling'],
    why: 'Talking with a counselor is a healthy way to carry stress and hard things.',
    small: s('Reach out to schedule a counseling appointment', 'other', 'this month'),
    steady: s('Meet with a counselor', 'other', 'twice a month'),
    stretch: s('Meet with a counselor', 'weekly'),
  }),
  practice('screen-time', 'health', 'Less screen time', {
    legacyNames: ['Screen Time Reduction'],
    why: 'Less time on screens leaves room for rest and people.',
    small: s('Keep my phone out of my bedroom', 'daily'),
    steady: s('Keep to a daily screen time limit', 'daily'),
    stretch: s('Take one evening off screens', 'weekly'),
  }),
  practice('healthy-hobbies', 'health', 'Healthy hobbies', {
    legacyNames: ['Healthy Hobbies'],
    why: 'A hobby you enjoy refreshes your mind.',
    small: s('Spend an hour on a hobby I enjoy', 'weekly'),
    steady: s('Spend time on a hobby I enjoy', 'few-weekly'),
    stretch: s('Join a class or group built around a hobby', 'weekly'),
  }),
  practice('medical-checkups', 'health', 'Checkups', {
    legacyNames: ['Medical Checkups'],
    why: 'Caring for your body includes regular checkups.',
    small: s('Schedule my yearly checkup', 'other', 'this year'),
    steady: s('Schedule my yearly checkup and any screenings my doctor recommends', 'other', 'this year'),
    stretch: s('Schedule my checkup, screenings and dentist visits', 'other', 'this year'),
  }),

  // Purpose
  practice('serving', 'purpose', 'Serving', {
    core: true,
    habitItem: 'purpose_serving',
    legacyNames: ['Serving'],
    why: 'Serving is how you discover and use the gifts God gave you.',
    small: s('Serve at church or in my community', 'monthly'),
    steady: s('Serve at church or in my community', 'other', 'twice a month'),
    stretch: s('Serve on a team at church', 'weekly'),
  }),
  practice('evangelism', 'purpose', 'Who is next', {
    core: true,
    habitItem: 'purpose_who_next',
    legacyNames: ['Evangelism'],
    why: 'Someone near you needs to hear about Jesus.',
    small: s('Pray by name for one person far from God', 'daily'),
    steady: s('Pray for three people by name and look for a chance to talk', 'weekly'),
    stretch: s('Invite someone to church or share my story with them', 'monthly'),
  }),
  practice('spiritual-gifts', 'purpose', 'Spiritual gifts', {
    legacyNames: ['Spiritual Gifts Assessment'],
    why: 'Knowing your gifts helps you find where you fit.',
    small: s('Take a spiritual gifts assessment', 'other', 'this month'),
    steady: s('Try serving in an area that fits my gifts', 'monthly'),
    stretch: s('Talk through my gifts with a leader and choose a place to serve', 'monthly'),
  }),
  practice('purpose-mentorship', 'purpose', 'Mentorship', {
    legacyNames: ['Mentorship'],
    why: 'Someone who has walked the road can help you see your next step.',
    small: s('Ask someone I respect about their calling', 'other', 'this month'),
    steady: s('Meet with a mentor about my next step', 'monthly'),
    stretch: s('Meet with a mentor and set one goal for how I serve', 'monthly'),
  }),
  practice('rule-of-life', 'purpose', 'Rule of life', {
    legacyNames: ['Rule of Life'],
    why: 'A rule of life is a short plan for how you want to live.',
    small: s('Write down three rhythms I want in my week', 'other', 'this month'),
    steady: s('Review my rule of life', 'monthly'),
    stretch: s('Review my rule of life and adjust my calendar to match it', 'weekly'),
  }),
  practice('books', 'purpose', 'Books and audiobooks', {
    legacyNames: ['Books/Audiobooks'],
    why: 'Good books help you grow in wisdom.',
    small: s('Read or listen to a helpful book for twenty minutes', 'weekly'),
    steady: s('Read or listen to a helpful book for twenty minutes', 'few-weekly'),
    stretch: s('Read or listen to a helpful book for twenty minutes', 'daily'),
  }),
  practice('podcasts', 'purpose', 'Podcasts', {
    legacyNames: ['Podcasts'],
    why: 'A helpful podcast can turn a commute into time to grow.',
    small: s('Listen to one helpful podcast episode', 'weekly'),
    steady: s('Listen to a helpful podcast episode', 'few-weekly'),
    stretch: s('Listen to a helpful episode and talk about it with a friend', 'weekly'),
  }),
  practice('purpose-pastor-conversation', 'purpose', 'Talk with a pastor about your next step', {
    support: true,
    why: 'A pastor can help you see where God may be leading you.',
    small: s('Ask a pastor or leader for a time to talk', 'other', 'this month'),
    steady: s('Meet with a pastor or leader about my next step', 'monthly'),
    stretch: s('Meet with a pastor or leader and take the next step we agree on', 'monthly'),
  }),

  // Character
  practice('scripture-memory', 'character', 'Scripture memory', {
    core: true,
    habitItem: 'character_memory',
    legacyNames: ['Scripture Memory'],
    why: 'Verses you know by heart come back to you when you need them.',
    small: s('Learn one verse', 'weekly'),
    steady: s('Learn one verse and review the last few', 'weekly'),
    stretch: s('Memorize a passage and review it', 'daily'),
  }),
  practice('confession', 'character', 'Confession', {
    core: true,
    habitItem: 'character_confession',
    legacyNames: ['Daily Confession & Repentance'],
    why: 'Being honest with God and a friend loosens the hold of sin.',
    small: s('End my day by telling God where I fell short', 'daily'),
    steady: s('Check in with one trusted friend about where I fell short', 'weekly'),
    stretch: s('Meet with an accountability partner and confess to God each day', 'weekly'),
  }),
  practice('accountability', 'character', 'Accountability partner', {
    support: true,
    legacyNames: ['Accountability Relationships'],
    why: 'Trusted friends help you see your blind spots.',
    small: s('Ask one person to be my accountability partner', 'other', 'this month'),
    steady: s('Meet with my accountability partner', 'other', 'twice a month'),
    stretch: s('Meet with my accountability partner', 'weekly'),
  }),
  practice('internet-boundaries', 'character', 'Internet boundaries', {
    legacyNames: ['Internet Boundaries'],
    why: 'Clear limits help you stay the same person online and off.',
    small: s('Turn on content filters on my devices', 'other', 'this week'),
    steady: s('Share my device report with a trusted friend', 'weekly'),
    stretch: s('Share my device report and talk it through with a trusted friend', 'weekly'),
  }),
  practice('media-boundaries', 'character', 'Media boundaries', {
    legacyNames: ['Media Boundaries'],
    why: 'What you watch shapes what you want.',
    small: s('Choose what I will watch before I turn on a screen', 'weekly'),
    steady: s('Choose what I will watch before I turn on a screen', 'daily'),
    stretch: s('Choose what I watch ahead of time and drop one show that pulls me away from God', 'daily'),
  }),
  practice('social-media-boundaries', 'character', 'Social media boundaries', {
    legacyNames: ['Social Media Boundaries'],
    why: 'Time on social media can feed comparison and distraction.',
    small: s('Wait until after my morning routine to open social media', 'daily'),
    steady: s('Keep social media to thirty minutes a day', 'daily'),
    stretch: s('Take one day off social media', 'weekly'),
  }),

  // Contentment
  practice('gratitude', 'contentment', 'Gratitude', {
    core: true,
    habitItem: 'contentment_gratitude',
    legacyNames: ['Gratitude'],
    why: 'Giving thanks changes how you see what God has already given you.',
    small: s('Write down one thing I am thankful for', 'daily'),
    steady: s('Thank God for three specific things each morning', 'daily'),
    stretch: s('Thank God for three things and tell one person I am thankful for them', 'daily'),
  }),
  practice('sabbath', 'contentment', 'Weekly rest', {
    core: true,
    habitItem: 'contentment_rest',
    legacyNames: ['Weekly Sabbath'],
    why: 'A weekly day of rest reminds you that God is in charge.',
    small: s('Take a half day off to rest and worship', 'weekly'),
    steady: s('Keep one full day for rest and worship', 'weekly'),
    stretch: s('Keep one full day for rest, worship and people I love, with no work email', 'weekly'),
  }),
  practice('silence-solitude', 'contentment', 'Silence and solitude', {
    legacyNames: ['Silence and Solitude'],
    why: 'Quiet time with God helps you hear past the noise.',
    small: s('Spend ten minutes alone with God and no phone', 'weekly'),
    steady: s('Spend ten minutes alone with God and no phone', 'few-weekly'),
    stretch: s('Spend an hour alone with God', 'weekly'),
  }),
  practice('scripture-meditation', 'contentment', 'Scripture meditation', {
    legacyNames: ['Scripture Meditation'],
    why: 'Slowing down with one verse lets it sink in.',
    small: s('Read one verse slowly three times and pray it', 'weekly'),
    steady: s('Read one verse slowly three times and pray it', 'few-weekly'),
    stretch: s('Choose a verse for the week and pray it each morning', 'daily'),
  }),
  practice('living-simply', 'contentment', 'Living with less', {
    legacyNames: ['Decluttering/Living Simply'],
    why: 'Less clutter leaves more room for what matters.',
    small: s('Clear one drawer or shelf', 'weekly'),
    steady: s('Clear one space and give away what I do not need', 'weekly'),
    stretch: s('Wait thirty days before buying anything I do not need', 'other', 'this month'),
  }),
  practice('community-service', 'contentment', 'Community service', {
    legacyNames: ['Community Service'],
    why: 'Serving others turns your eyes away from what you lack.',
    small: s('Serve one time in my community', 'other', 'this season'),
    steady: s('Serve in my community', 'monthly'),
    stretch: s('Serve in my community', 'other', 'twice a month'),
  }),
  practice('media-fasting', 'contentment', 'Media fast', {
    legacyNames: ['Media/Social Media Fasting'],
    why: 'A break from media can quiet comparison.',
    small: s('Take one evening off social media and streaming', 'weekly'),
    steady: s('Take one day off social media and streaming', 'weekly'),
    stretch: s('Take a week off social media', 'other', 'this season'),
  }),
  practice('contentment-care-conversation', 'contentment', 'Talk with someone you trust', {
    support: true,
    why: 'A hard season is lighter when someone walks through it with you.',
    small: s('Tell one trusted person how I am doing', 'other', 'this week'),
    steady: s('Meet with a pastor, counselor or trusted friend', 'monthly'),
    stretch: s('Meet with a counselor', 'other', 'twice a month'),
  }),
];

export const PRACTICES_BY_KEY = Object.fromEntries(PRACTICES.map((p) => [p.key, p]));

export function practicesFor(dimension) {
  return PRACTICES.filter((p) => p.dimension === dimension);
}

export function getPractice(key) {
  return key ? PRACTICES_BY_KEY[key] ?? null : null;
}

// Match a v1 goal (no practice_key) to a practice by its discipline or name.
export function practiceForLegacyGoal(goal) {
  const candidates = [goal?.discipline, goal?.goal_name].filter(Boolean).map((v) => String(v).trim().toLowerCase());
  if (!candidates.length) return null;
  return (
    PRACTICES.find(
      (p) =>
        p.dimension === goal.dimension &&
        p.legacyNames.some((n) => candidates.includes(n.toLowerCase())),
    ) ?? null
  );
}
