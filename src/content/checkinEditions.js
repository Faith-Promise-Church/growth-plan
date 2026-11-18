// Monthly check-in editions. This is the seed for the checkin_content table
// (supabase/migrations/20261117000150_checkins.sql is generated from it by
// scripts/gen-checkin-seed.js) and the source for dry-run renders.
// Pastor Zac's notes are drafts for his review and are seeded exactly as written in the brief.

const DECEMBER = {
  theme: 'Looking back, looking ahead',
  subject: 'Your December check-in: look back, look ahead',
  preheader: 'Thank God for this year, then give him the next one.',
  zac_note:
    'Look back on this year and thank God for every step you took, including the small ones. Then look ahead and give him the whole year to come. Take time this month to review your plan and build your next one, because I believe your best growth is still ahead of you.',
  article_title: 'Ten Questions for a New Year',
  article_source: 'Don Whitney, Desiring God',
  article_url: 'https://www.desiringgod.org/articles/ten-questions-for-a-new-year',
  article_blurb: 'Ten questions to pray through as one year closes and the next begins.',
};

export const CHECKIN_EDITIONS = [
  { period: '2026-12-01', ...DECEMBER },
  {
    period: '2027-01-01',
    theme: 'Faith: prayer',
    subject: 'Your January check-in: five minutes of prayer',
    preheader: 'You begin this year as a loved son or daughter of God.',
    zac_note:
      'You start this year as a loved son or daughter of God, and nothing you do this month will change that. So I want to challenge you to pray every day, even if you start with five minutes. We are praying together as a church this month, and I believe God will meet you there.',
    article_title: "How to Make Prayer a Habit You Can't Break",
    article_source: 'Baptist Press',
    article_url: 'https://www.baptistpress.com/resource-library/bptoolbox/how-to-make-prayer-a-habit-you-cant-break',
    article_blurb: 'A practical case for a small daily prayer habit that you keep.',
  },
  {
    period: '2027-02-01',
    theme: 'Relationships',
    subject: 'Your February check-in: the people around you',
    preheader: 'This month, go deeper with the people God has given you.',
    zac_note:
      'God made you to need people. Your friends and family will shape who you become more than almost anything else this year. If you are not in a group yet, make this the month you join one. If you are in one, go a level deeper with someone and tell them how you are doing.',
    article_title: 'Good genes are nice, but joy is better',
    article_source: 'Harvard Gazette',
    article_url: 'https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/',
    article_blurb: 'What an 80-year Harvard study found about close relationships and a good life.',
  },
  {
    period: '2027-03-01',
    theme: 'Character',
    subject: 'Your March check-in: living in the light',
    preheader: 'Tell one trusted friend the truth about how you are doing.',
    zac_note:
      'Who you are when nobody is watching matters to God, and it matters to the people who count on you. This month, tell one trusted friend the truth about where you are struggling. You will find grace there, because Jesus has already forgiven you.',
    article_title: 'Walk in the Light: How God Uses Our Confession to Others',
    article_source: 'Garrett Kell, The Gospel Coalition',
    article_url: 'https://www.thegospelcoalition.org/article/confession-others-sin/',
    article_blurb: 'Why telling a trusted friend the truth loosens the hold of hidden sin.',
  },
  {
    period: '2027-04-01',
    theme: 'Purpose: who is next',
    subject: 'Your April check-in: who is next?',
    preheader: 'Pray for one person by name every day this month.',
    zac_note:
      'Someone in your life needs to hear about Jesus, and I believe God put you near them on purpose. Write down their name and pray for them every day this month. Ask God for a chance to talk with them, and take it when it comes.',
    article_title: '5 Tips for Sharing the Gospel with Friends',
    article_source: 'Jesus Film Project',
    article_url: 'https://www.jesusfilm.org/blog/sharing-gospel-with-friends/',
    article_blurb: 'Five simple ways to talk about Jesus with people you already love, starting with prayer.',
  },
  {
    period: '2027-05-01',
    theme: 'Health',
    subject: 'Your May check-in: caring for your body',
    preheader: 'Pick one habit for your body this month and stay with it.',
    zac_note:
      'Your body is a gift from God, and caring for it is part of following Jesus. You cannot give your best to your family, your work, or your calling when you are worn out. Choose one habit this month, whether that is sleep, movement, or how you eat, and stay with it.',
    article_title: 'A Brief Theology of Sleep',
    article_source: 'John Piper, Desiring God',
    article_url: 'https://www.desiringgod.org/articles/a-brief-theology-of-sleep',
    article_blurb: 'A short reflection on why God made us need rest every night.',
  },
  {
    period: '2027-06-01',
    theme: 'Contentment: rest',
    subject: 'Your June check-in: a day of rest',
    preheader: 'Protect one day each week for worship, people and rest.',
    zac_note:
      'God rested, and he invites you to rest with him. A weekly day of rest reminds you that God is in charge and that you can trust him with what is left undone. Protect one day each week this month for worship, for the people you love, and for things you enjoy.',
    article_title: 'What Is the Sabbath in the Bible and Should Christians Observe It?',
    article_source: 'BibleProject',
    article_url: 'https://bibleproject.com/articles/keeping-the-sabbath-is-it-still-relevant-to-christians-today/',
    article_blurb: 'A six-minute walk through what the Bible says about a weekly day of rest.',
  },
  {
    period: '2027-07-01',
    theme: 'Starting again',
    subject: 'Your July check-in: start again',
    preheader: 'Halfway through the year is a good time to start again.',
    zac_note:
      'Halfway through the year is a good time to be honest about where you are. If you have fallen behind on your plan, you have not failed, and God has not given up on you. Pick the smallest version of one habit and start again today.',
    article_title: 'Avoid the Second Mistake',
    article_source: 'James Clear',
    article_url: 'https://jamesclear.com/second-mistake',
    article_blurb: 'Missing once does not undo a habit. What matters is how quickly you start again.',
  },
  {
    period: '2027-08-01',
    theme: 'Faith: Scripture',
    subject: 'Your August check-in: ten minutes in Scripture',
    preheader: 'Open your Bible before you open your phone this month.',
    zac_note:
      'God wants to speak to you through his Word every day. You will grow more from ten minutes in Scripture each morning than from an hour once in a while. Open your Bible before you open your phone this month, and ask God to show you one thing to put into practice.',
    article_title: 'How to Study the Bible for Beginners in 4 Simple Steps',
    article_source: 'Life.Church',
    article_url: 'https://finds.life.church/beginners-guide-to-studying-the-bible/',
    article_blurb: 'Where to begin and how to build a steady Bible habit.',
  },
  {
    period: '2027-09-01',
    theme: 'Finances',
    subject: 'Your September check-in: a plan for your money',
    preheader: 'Put giving first this month, then make a plan for the rest.',
    zac_note:
      'Money shapes what we care about, which is why Jesus talked about it so often. A plan for your money gives you room to breathe and room to be generous. I invite you to sit down this month, put giving first, and make a plan for the rest.',
    article_title: 'How to Budget',
    article_source: 'Ramsey Solutions',
    article_url: 'https://www.ramseysolutions.com/budgeting/how-to-make-a-budget',
    article_blurb: 'A step-by-step guide to making a monthly budget before the month begins.',
  },
  {
    period: '2027-10-01',
    theme: 'Purpose: serving',
    subject: 'Your October check-in: use your gifts',
    preheader: 'Take one new step in serving this month and watch how God uses you.',
    zac_note:
      'God gave you gifts that our church and our city need. Most people discover those gifts by serving, so the best next step is to start. Join the Winning Team this month, or take one new step where you already serve, and watch how God uses you.',
    article_title: 'How do I discover my spiritual gift?',
    article_source: 'Juan Sanchez, The Gospel Coalition',
    article_url: 'https://thegospelcoalition.org/article/how-do-i-discover-my-spiritual-gift',
    article_blurb: 'The best way to find your gifts is to start serving where you are needed.',
  },
  {
    period: '2027-11-01',
    theme: 'Contentment: gratitude',
    subject: 'Your November check-in: three things each day',
    preheader: 'Before this month gets busy, start each day with thanks.',
    zac_note:
      'Gratitude changes how you see everything God has already given you. Before this month gets busy, begin each day by thanking God for three specific things. I am thankful for you and for the way you keep growing.',
    article_title: 'Gratitude enhances health, brings happiness, and may even lengthen lives',
    article_source: 'Harvard Health Publishing',
    article_url: 'https://www.health.harvard.edu/blog/gratitude-enhances-health-brings-happiness-and-may-even-lengthen-lives-202409113071',
    article_blurb: 'Research on what a habit of giving thanks does for a person, with six questions to try.',
  },
  { period: '2027-12-01', ...DECEMBER },
];

// Used when a month has no row in checkin_content. The engine also emails the admins.
export const EVERGREEN_EDITION = {
  period: null,
  theme: 'Keep going',
  subject: 'Your monthly check-in',
  preheader: 'A few minutes to look at your plan and take the next step.',
  zac_note:
    'You belong to God, and he is patient with you as you grow. Take a few minutes this month to look at your plan and be honest about how it is going. Choose one habit to keep, and if one feels too big, make it smaller and keep going. I am cheering for you.',
  article_title: 'Avoid the Second Mistake',
  article_source: 'James Clear',
  article_url: 'https://jamesclear.com/second-mistake',
  article_blurb: 'Missing once does not undo a habit. What matters is how quickly you start again.',
};

export const CHECKIN_CONTENT_FIELDS = [
  'theme',
  'subject',
  'preheader',
  'zac_note',
  'article_title',
  'article_url',
  'article_source',
  'article_blurb',
];
