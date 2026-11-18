# Content for review

Everything below is a draft for Justin and Pastor Zac to review. It is generated from the files in
`src/content/` by `node scripts/content-review.js`, so edit those files, not this one.

Where to change things:

| What | File |
|---|---|
| Habit items and the attribution | `src/content/assessment.js` |
| Practice library (Helper suggestions) | `src/content/practices.js` |
| "About this area" text | `src/content/dimensions.js` |
| Check-in emails (seed) | `src/content/checkinEditions.js`, then `node scripts/gen-checkin-seed.js`. After the migration is applied, edit editions in Admin, Check-ins |
| Outside links (care, groups, serving, giving, counseling, coaching) | `src/content/links.js` |

## Things to decide

- **Links.** Every link in `src/content/links.js` is empty, so the app hides them. The care link matters most: it appears on the results page when someone answers 3 or below on basic needs, emotional resilience or happiness, and in the Helper for "Faithful in a hard season".
- **Article links.** All twelve are confirmed live (see `docs/PRESSURE_TEST.md`, section 5).
- **October note** mentions "the Winning Team". The copy rules ask for no church jargon; it is seeded as written because the brief said not to rewrite the notes.
- **Evergreen edition.** Used only when a month has no content. Its Pastor Zac note is new and needs his review.

## Assessment

### Attribution (assessment intro and results page)

> Several questions are adapted from the Flourishing measure developed by the Human Flourishing Program at Harvard University (VanderWeele, 2017, PNAS 114(31):8148-8156), used under CC BY-NC 4.0. The wording and scale differ from the original, so these scores cannot be compared with published Harvard results.

### Layer 1: Flourishing (unchanged from v1)

| Column | Question | Source |
|---|---|---|
| `faith_q1` | I believe the Bible is the ultimate authority for how I should live my life. | Faith Promise |
| `faith_q2` | I actively strive to put Jesus first in my decisions, schedule, and priorities. | Faith Promise |
| `faith_q3` | I regularly experience a sense of connection with God in my daily life, not just on Sundays. | Faith Promise |
| `relationships_q1` | I am content with the quality and depth of my current friendships and family relationships. | Harvard item 9, adapted. Adapted from "I am content with my friendships and relationships." |
| `relationships_q2` | I have a trusted circle of people who know my real struggles and encourage me to grow. | Faith Promise |
| `relationships_q3` | When conflict arises in my relationships, I take initiative to resolve it in a healthy way rather than ignoring it. | Faith Promise |
| `finances_q1` | I feel secure that my basic needs (food, housing, safety) are being met. | Harvard item 12, adapted. Adapted from the worry about safety, food or housing item; phrased positively, so the direction is reversed. |
| `finances_q2` | I am free from dominating anxiety or overwhelming worry regarding my monthly expenses. | Harvard item 11, adapted. Adapted from the worry about monthly living expenses item; phrased positively, so the direction is reversed. |
| `finances_q3` | I view my financial resources as a tool to do good and I find joy in being generous toward others. | Faith Promise |
| `health_q1` | I have the physical energy and health needed to accomplish the things that matter most to me. | Harvard item 3, adapted. Adapted from the physical health rating. |
| `health_q2` | I generally feel emotionally resilient and capable of handling life's daily stressors. | Harvard item 4, adapted. Adapted from the mental health rating. |
| `purpose_q1` | Overall, I feel that the things I do in my life are worthwhile and contribute to a greater cause. | Harvard item 5, adapted. Adapted from the worthwhile activities item. |
| `purpose_q2` | I have a clear sense of how my unique skills and gifts can be used to make a difference in the world. | Harvard item 6, adapted. Adapted from "I understand my purpose in life." |
| `purpose_q3` | I am actively using my time and talents to serve others (in my home, work, or church). | Faith Promise |
| `character_q1` | I consistently strive to do what is right, even in difficult or challenging situations. | Harvard item 7, adapted. Adapted from the promoting good item. |
| `character_q2` | I am able to delay short-term pleasure or comfort in order to achieve greater long-term growth. | Harvard item 8, adapted. Adapted from the delayed gratification item. |
| `character_q3` | My private thoughts and actions align with the person I present to others publicly (I am the same person in the dark as I am in the light). | Faith Promise |
| `contentment_q1` | Overall, I am satisfied with my life as a whole these days. | Harvard item 1, adapted. Adapted from the life satisfaction item. |
| `contentment_q2` | In general, I usually feel happy and at peace rather than discouraged or anxious. | Harvard item 2, adapted. Adapted from the happiness item. |
| `contentment_q3` | I frequently find myself pausing to be thankful for what I have, rather than focusing on what I lack. | Faith Promise |

### Layer 2: Habits (new)

Stem: **Over the last month, how steady has this been for you?**

Answers (stored 0 to 4): 0 Not right now, 1 Once in a while, 2 About half the time, 3 Most of the time, 4 A steady rhythm.

| Dimension | Item | Related practice |
|---|---|---|
| Faith | Reading or listening to Scripture | `scripture-reading` |
| Faith | Unhurried time in prayer | `prayer` |
| Faith | Worshiping with my church on the weekend | `church-attendance` |
| Relationships | Meeting with a group or a few friends who know what is going on in my life | `group-attendance` |
| Relationships | Giving the people closest to me my full attention, with my phone put away | `phone-free-times` |
| Finances | Giving to God first, before other spending | `tithing-giving` |
| Finances | Following a written plan for my spending | `budgeting` |
| Health | Getting enough sleep to feel rested | `sleep` |
| Health | Moving my body for 30 minutes or more | `exercise` |
| Health | Eating in a way that gives me energy | `nutrition` |
| Purpose | Serving someone with my time or skills | `serving` |
| Purpose | Praying for someone far from God, or taking a step toward a spiritual conversation | `evangelism` |
| Character | Memorizing or reviewing Scripture | `scripture-memory` |
| Character | Being honest with God and one trusted person about where I fell short | `confession` |
| Contentment | Stopping to thank God for specific things | `gratitude` |
| Contentment | Keeping a weekly day of rest | `sabbath` |

## About this area (replaces the three v1 interstitial slides)

**Faith**

- What it is: Faith is about trusting the Bible as your guide, putting Jesus first in your choices, and staying connected with God every day.
- Why it matters: You were made to know God. When that connection is strong, the rest of your life has something steady to hold on to.
- How to grow: Grow here by building daily time in Scripture and prayer, bringing your decisions to Jesus, and worshiping with your church.

**Relationships**

- What it is: Relationships is about the quality of your friendships and family ties, how honest you can be with others, and how connected you are to a community.
- Why it matters: God made you for connection. Being alone for too long wears you down, and good friends help you through hard seasons.
- How to grow: Grow here by spending time with people who know you well, giving the people closest to you your full attention, and working through conflict when it comes.

**Finances**

- What it is: Finances is about how you manage what God has given you, how free you are from worry about money, and how generous you are with others.
- Why it matters: Money stress takes up a lot of room in your mind. A healthy plan for your money gives you room to breathe and room to give.
- How to grow: Grow here by making a spending plan you can keep, getting wise help with debt, and putting giving first.

**Health**

- What it is: Health is about caring for your body and your mind so you have the energy to do what God has called you to do.
- Why it matters: Your body carries you through every part of your life. When you are worn out, everything else gets harder.
- How to grow: Grow here by building steady habits around sleep, movement and food, finding healthy ways to handle stress, and respecting the limits of your body.

**Purpose**

- What it is: Purpose is about your sense of calling, using the gifts God gave you, and knowing that your life makes a difference.
- Why it matters: People need more than comfort to thrive. Knowing why you are here helps you keep going when life is hard.
- How to grow: Grow here by learning how God has wired you, trying new ways to serve others, and making room in your week for what God has asked you to do.

**Character**

- What it is: Character is about your integrity, being the same person in private as you are in public, and choosing what is right over what is easy.
- Why it matters: Talent can open doors, and character keeps them open. It holds your life together when pressure comes.
- How to grow: Grow here by inviting God and trusted friends to point out your blind spots, keeping your word in small things, and building habits of honesty and self-control.

**Contentment**

- What it is: Contentment is about how satisfied you are with your life, how often you give thanks, and whether your joy holds steady when things change.
- Why it matters: Our culture always wants more. Contentment lets you enjoy the life God has given you today.
- How to grow: Grow here by giving thanks every day, comparing yourself to others less, and finding your joy in God more than in what happens to you.

## Practice library

Core practices (the 15 v1 required goals) show first in the Helper with "Recommended by Faith Promise". Support practices lead the Helper when someone is "Faithful in a hard season".

### Faith

**Scripture reading** (`scripture-reading`; core, habit item `faith_scripture`)

- Why: Time in God's Word shapes how you think and what you love.
- Small: Read one Psalm before I pick up my phone on weekdays.
- Steady: Read one chapter of the Bible each morning every day.
- Stretch: Read two chapters and write down one thing to put into practice every day.

**Prayer** (`prayer`; core, habit item `faith_prayer`)

- Why: Prayer is how your friendship with God grows.
- Small: Pray for five minutes before I start my day on weekdays.
- Steady: Spend ten minutes in prayer with a short list of people and needs every day.
- Stretch: Spend twenty unhurried minutes in prayer, with time to listen every day.

**Weekend worship** (`church-attendance`; core, habit item `faith_worship`)

- Why: Worshiping with your church family keeps you anchored and known.
- Small: Worship with my church in person or online twice a month.
- Steady: Worship with my church in person once a week.
- Stretch: Worship with my church and welcome someone new once a week.

**Fasting** (`fasting`)

- Why: Going without food for a time helps you depend on God.
- Small: Skip one meal and use that time to pray once a month.
- Steady: Skip one meal and use that time to pray once a week.
- Stretch: Fast for a full day and spend meal times in prayer once a month.

**Journaling** (`journaling`)

- Why: Writing your prayers and thoughts helps you notice what God is doing.
- Small: Write a few lines about what God is teaching me once a week.
- Steady: Write a few lines about what God is teaching me a few times a week.
- Stretch: Write my prayers and one takeaway from Scripture every day.

**Personal worship** (`personal-worship`)

- Why: Worship belongs in your week as well as on the weekend.
- Small: Listen to one worship song and pray it back to God a few times a week.
- Steady: Start my day with a worship song every day.
- Stretch: Spend fifteen minutes in worship and prayer at home every day.

**Bible reading plan** (`bible-reading-plan`)

- Why: A plan helps you keep going on the days you do not feel like it.
- Small: Follow a short Bible reading plan on weekdays.
- Steady: Follow a one-year Bible reading plan every day.
- Stretch: Follow a one-year plan and talk about it with a friend each week every day.

**Listening prayer** (`listening-prayer`)

- Why: Prayer is a conversation, so it includes time to listen.
- Small: Sit in silence for five minutes and ask God to speak once a week.
- Steady: Sit in silence for ten minutes and ask God to speak a few times a week.
- Stretch: Sit in silence for ten minutes and write down what I sense every day.

**Talk with a pastor** (`faith-pastor-conversation`; support)

- Why: You do not have to carry a hard season alone.
- Small: Ask a pastor or group leader for a time to talk this month.
- Steady: Meet with a pastor or mentor once a month.
- Stretch: Meet with a pastor or mentor and pray together once a month.

### Relationships

**Group** (`group-attendance`; core, support, habit item `relationships_group`)

- Why: You grow best with a few people who know what is going on in your life.
- Small: Meet with my group twice a month.
- Steady: Meet with my group once a week.
- Stretch: Meet with my group and get together with one person from it outside of group once a week.

**Phone-free time** (`phone-free-times`; habit item `relationships_attention`)

- Why: Your full attention tells people they matter to you.
- Small: Put my phone in another room during one family meal once a week.
- Steady: Keep my phone away during dinner every day.
- Stretch: Keep my phone away from dinner until bedtime every day.

**Family and friend nights** (`family-nights`)

- Why: Shared time builds strong families and friendships.
- Small: Plan one night with family or friends once a month.
- Steady: Plan one night with family or friends once a week.
- Stretch: Plan a night with family or friends and take turns choosing what we do once a week.

**Date nights** (`date-nights`)

- Why: A marriage grows when you make time for it.
- Small: Plan a date with my spouse once a month.
- Steady: Plan a date with my spouse twice a month.
- Stretch: Plan a date with my spouse once a week.

**Mentoring** (`mentoring`)

- Why: Learning from someone further along helps you grow.
- Small: Ask someone I respect to meet for coffee this month.
- Steady: Meet with a mentor once a month.
- Stretch: Meet with a mentor and meet with someone I can encourage once a month.

**Friends far from God** (`missional-relationships`)

- Why: Most people first hear about Jesus from a friend.
- Small: Invite a neighbor or coworker for a meal once a month.
- Steady: Spend time with a friend who does not know Jesus twice a month.
- Stretch: Spend time with a friend who does not know Jesus once a week.

**Reconciliation** (`reconciliation`)

- Why: Conflict that is left alone weighs on you and the people you love.
- Small: Pray for one person I am in conflict with every day.
- Steady: Reach out to one person to start making things right this month.
- Stretch: Have an honest conversation to make things right, with help from a pastor if I need it this month.

**Counseling for a relationship** (`relationship-counseling`; support)

- Why: A counselor can help when a relationship feels stuck.
- Small: Reach out to schedule a counseling appointment this month.
- Steady: Meet with a counselor twice a month.
- Stretch: Meet with a counselor once a week.

### Finances

**Giving** (`tithing-giving`; core, habit item `finances_giving`)

- Why: Giving first reminds you that everything you have comes from God.
- Small: Set up a gift to my church once a month.
- Steady: Give a set percentage to my church before other spending each payday.
- Stretch: Give a tithe first and set aside a gift for a need I see each payday.

**Spending plan** (`budgeting`; core, habit item `finances_plan`)

- Why: A written plan tells your money where to go, so you worry less.
- Small: Write a simple spending plan before the month begins once a month.
- Steady: Check my spending against my plan once a week.
- Stretch: Review my spending plan with my spouse or a friend once a week.

**Emergency savings** (`emergency-savings`)

- Why: Savings turn emergencies into inconveniences.
- Small: Set aside a small amount in savings each payday.
- Steady: Set aside a set amount in savings each payday.
- Stretch: Add to savings until I have one month of expenses set aside each payday.

**Financial coaching** (`financial-coaching`; support)

- Why: A coach can help you make a plan and stay with it.
- Small: Ask about financial coaching at church this month.
- Steady: Meet with a financial coach once a month.
- Stretch: Meet with a financial coach and follow the plan we make once a month.

**Paying down debt** (`debt-reduction`)

- Why: Paying down debt gives you freedom to say yes to God.
- Small: Pay a little extra on my smallest debt once a month.
- Steady: Put extra money toward one debt at a time once a month.
- Stretch: Track my payoff plan and put every extra dollar toward debt once a week.

**Giving beyond church** (`charitable-giving`)

- Why: Generosity grows when you look for needs around you.
- Small: Give to one need outside our church this season.
- Steady: Give to a cause I care about once a month.
- Stretch: Give to a cause I care about and serve there once a month.

**Simplifying** (`simplifying`)

- Why: Owning less can bring more peace.
- Small: Give away one bag of things I do not use once a month.
- Steady: Clear out one space and donate what I do not need once a week.
- Stretch: Buy nothing I do not need for a month this month.

### Health

**Sleep** (`sleep`; core, habit item `health_sleep`)

- Why: Rest is how God made your body to recover.
- Small: Put my phone away thirty minutes before bed on weekdays.
- Steady: Go to bed at the same time each night every day.
- Stretch: Keep a set bedtime and wake time so I get seven to eight hours of sleep every day.

**Movement** (`exercise`; core, habit item `health_movement`)

- Why: Moving your body gives you energy for what matters.
- Small: Take a fifteen-minute walk a few times a week.
- Steady: Move my body for thirty minutes a few times a week.
- Stretch: Move my body for thirty minutes or more every day.

**Eating well** (`nutrition`; core, habit item `health_eating`)

- Why: What you eat affects your energy and your mood.
- Small: Drink a glass of water with every meal every day.
- Steady: Plan my meals for the week once a week.
- Stretch: Plan my meals and cook at home most nights once a week.

**A healthy goal with my doctor** (`healthy-weight`)

- Why: Small, steady changes add up, and a doctor can help you choose the right ones.
- Small: Talk with my doctor about one healthy goal this season.
- Steady: Take one step toward the goal my doctor and I set once a week.
- Stretch: Take one step toward our goal and check in with a friend about it once a week.

**Counseling** (`counseling`; support)

- Why: Talking with a counselor is a healthy way to carry stress and hard things.
- Small: Reach out to schedule a counseling appointment this month.
- Steady: Meet with a counselor twice a month.
- Stretch: Meet with a counselor once a week.

**Less screen time** (`screen-time`)

- Why: Less time on screens leaves room for rest and people.
- Small: Keep my phone out of my bedroom every day.
- Steady: Keep to a daily screen time limit every day.
- Stretch: Take one evening off screens once a week.

**Healthy hobbies** (`healthy-hobbies`)

- Why: A hobby you enjoy refreshes your mind.
- Small: Spend an hour on a hobby I enjoy once a week.
- Steady: Spend time on a hobby I enjoy a few times a week.
- Stretch: Join a class or group built around a hobby once a week.

**Checkups** (`medical-checkups`)

- Why: Caring for your body includes regular checkups.
- Small: Schedule my yearly checkup this year.
- Steady: Schedule my yearly checkup and any screenings my doctor recommends this year.
- Stretch: Schedule my checkup, screenings and dentist visits this year.

### Purpose

**Serving** (`serving`; core, habit item `purpose_serving`)

- Why: Serving is how you discover and use the gifts God gave you.
- Small: Serve at church or in my community once a month.
- Steady: Serve at church or in my community twice a month.
- Stretch: Serve on a team at church once a week.

**Who is next** (`evangelism`; core, habit item `purpose_who_next`)

- Why: Someone near you needs to hear about Jesus.
- Small: Pray by name for one person far from God every day.
- Steady: Pray for three people by name and look for a chance to talk once a week.
- Stretch: Invite someone to church or share my story with them once a month.

**Spiritual gifts** (`spiritual-gifts`)

- Why: Knowing your gifts helps you find where you fit.
- Small: Take a spiritual gifts assessment this month.
- Steady: Try serving in an area that fits my gifts once a month.
- Stretch: Talk through my gifts with a leader and choose a place to serve once a month.

**Mentorship** (`purpose-mentorship`)

- Why: Someone who has walked the road can help you see your next step.
- Small: Ask someone I respect about their calling this month.
- Steady: Meet with a mentor about my next step once a month.
- Stretch: Meet with a mentor and set one goal for how I serve once a month.

**Rule of life** (`rule-of-life`)

- Why: A rule of life is a short plan for how you want to live.
- Small: Write down three rhythms I want in my week this month.
- Steady: Review my rule of life once a month.
- Stretch: Review my rule of life and adjust my calendar to match it once a week.

**Books and audiobooks** (`books`)

- Why: Good books help you grow in wisdom.
- Small: Read or listen to a helpful book for twenty minutes once a week.
- Steady: Read or listen to a helpful book for twenty minutes a few times a week.
- Stretch: Read or listen to a helpful book for twenty minutes every day.

**Podcasts** (`podcasts`)

- Why: A helpful podcast can turn a commute into time to grow.
- Small: Listen to one helpful podcast episode once a week.
- Steady: Listen to a helpful podcast episode a few times a week.
- Stretch: Listen to a helpful episode and talk about it with a friend once a week.

**Talk with a pastor about your next step** (`purpose-pastor-conversation`; support)

- Why: A pastor can help you see where God may be leading you.
- Small: Ask a pastor or leader for a time to talk this month.
- Steady: Meet with a pastor or leader about my next step once a month.
- Stretch: Meet with a pastor or leader and take the next step we agree on once a month.

### Character

**Scripture memory** (`scripture-memory`; core, habit item `character_memory`)

- Why: Verses you know by heart come back to you when you need them.
- Small: Learn one verse once a week.
- Steady: Learn one verse and review the last few once a week.
- Stretch: Memorize a passage and review it every day.

**Confession** (`confession`; core, habit item `character_confession`)

- Why: Being honest with God and a friend loosens the hold of sin.
- Small: End my day by telling God where I fell short every day.
- Steady: Check in with one trusted friend about where I fell short once a week.
- Stretch: Meet with an accountability partner and confess to God each day once a week.

**Accountability partner** (`accountability`; support)

- Why: Trusted friends help you see your blind spots.
- Small: Ask one person to be my accountability partner this month.
- Steady: Meet with my accountability partner twice a month.
- Stretch: Meet with my accountability partner once a week.

**Internet boundaries** (`internet-boundaries`)

- Why: Clear limits help you stay the same person online and off.
- Small: Turn on content filters on my devices this week.
- Steady: Share my device report with a trusted friend once a week.
- Stretch: Share my device report and talk it through with a trusted friend once a week.

**Media boundaries** (`media-boundaries`)

- Why: What you watch shapes what you want.
- Small: Choose what I will watch before I turn on a screen once a week.
- Steady: Choose what I will watch before I turn on a screen every day.
- Stretch: Choose what I watch ahead of time and drop one show that pulls me away from God every day.

**Social media boundaries** (`social-media-boundaries`)

- Why: Time on social media can feed comparison and distraction.
- Small: Wait until after my morning routine to open social media every day.
- Steady: Keep social media to thirty minutes a day every day.
- Stretch: Take one day off social media once a week.

### Contentment

**Gratitude** (`gratitude`; core, habit item `contentment_gratitude`)

- Why: Giving thanks changes how you see what God has already given you.
- Small: Write down one thing I am thankful for every day.
- Steady: Thank God for three specific things each morning every day.
- Stretch: Thank God for three things and tell one person I am thankful for them every day.

**Weekly rest** (`sabbath`; core, habit item `contentment_rest`)

- Why: A weekly day of rest reminds you that God is in charge.
- Small: Take a half day off to rest and worship once a week.
- Steady: Keep one full day for rest and worship once a week.
- Stretch: Keep one full day for rest, worship and people I love, with no work email once a week.

**Silence and solitude** (`silence-solitude`)

- Why: Quiet time with God helps you hear past the noise.
- Small: Spend ten minutes alone with God and no phone once a week.
- Steady: Spend ten minutes alone with God and no phone a few times a week.
- Stretch: Spend an hour alone with God once a week.

**Scripture meditation** (`scripture-meditation`)

- Why: Slowing down with one verse lets it sink in.
- Small: Read one verse slowly three times and pray it once a week.
- Steady: Read one verse slowly three times and pray it a few times a week.
- Stretch: Choose a verse for the week and pray it each morning every day.

**Living with less** (`living-simply`)

- Why: Less clutter leaves more room for what matters.
- Small: Clear one drawer or shelf once a week.
- Steady: Clear one space and give away what I do not need once a week.
- Stretch: Wait thirty days before buying anything I do not need this month.

**Community service** (`community-service`)

- Why: Serving others turns your eyes away from what you lack.
- Small: Serve one time in my community this season.
- Steady: Serve in my community once a month.
- Stretch: Serve in my community twice a month.

**Media fast** (`media-fasting`)

- Why: A break from media can quiet comparison.
- Small: Take one evening off social media and streaming once a week.
- Steady: Take one day off social media and streaming once a week.
- Stretch: Take a week off social media this season.

**Talk with someone you trust** (`contentment-care-conversation`; support)

- Why: A hard season is lighter when someone walks through it with you.
- Small: Tell one trusted person how I am doing this week.
- Steady: Meet with a pastor, counselor or trusted friend once a month.
- Stretch: Meet with a counselor twice a month.

## Monthly check-in editions

Pastor Zac's notes are seeded exactly as written in the brief. The December edition is used for December 2026 and December 2027. Preheaders are new.

### December 2026

- Theme: Looking back, looking ahead
- Subject: Your December check-in: look back, look ahead
- Preheader: Thank God for this year, then give him the next one.
- Article: [Ten Questions for a New Year](https://www.desiringgod.org/articles/ten-questions-for-a-new-year), Don Whitney, Desiring God
- Blurb: Ten questions to pray through as one year closes and the next begins.
- From Pastor Zac (52 words): Look back on this year and thank God for every step you took, including the small ones. Then look ahead and give him the whole year to come. Take time this month to review your plan and build your next one, because I believe your best growth is still ahead of you.

### January 2027

- Theme: Faith: prayer
- Subject: Your January check-in: five minutes of prayer
- Preheader: Start the year with a few minutes of prayer each day.
- Article: [How to Make Prayer a Habit You Can't Break](https://www.baptistpress.com/resource-library/bptoolbox/how-to-make-prayer-a-habit-you-cant-break), Baptist Press
- Blurb: A practical case for a small daily prayer habit that you keep.
- From Pastor Zac (55 words): You start this year as a loved son or daughter of God, and nothing you do this month will change that. So I want to challenge you to pray every day, even if you start with five minutes. We are praying together as a church this month, and I believe God will meet you there.

### February 2027

- Theme: Relationships
- Subject: Your February check-in: the people around you
- Preheader: This month, go deeper with the people God has given you.
- Article: [Good genes are nice, but joy is better](https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/), Harvard Gazette
- Blurb: What an 80-year Harvard study found about close relationships and a good life.
- From Pastor Zac (55 words): God made you to need people. Your friends and family will shape who you become more than almost anything else this year. If you are not in a group yet, make this the month you join one. If you are in one, go a level deeper with someone and tell them how you are doing.

### March 2027

- Theme: Character
- Subject: Your March check-in: living in the light
- Preheader: Tell one trusted friend the truth about how you are doing.
- Article: [Walk in the Light: How God Uses Our Confession to Others](https://www.thegospelcoalition.org/article/confession-others-sin/), Garrett Kell, The Gospel Coalition
- Blurb: Why telling a trusted friend the truth loosens the hold of hidden sin.
- From Pastor Zac (44 words): Who you are when nobody is watching matters to God, and it matters to the people who count on you. This month, tell one trusted friend the truth about where you are struggling. You will find grace there, because Jesus has already forgiven you.

### April 2027

- Theme: Purpose: who is next
- Subject: Your April check-in: who is next?
- Preheader: Pray for one person by name every day this month.
- Article: [5 Tips for Sharing the Gospel with Friends](https://www.jesusfilm.org/blog/sharing-gospel-with-friends/), Jesus Film Project
- Blurb: Five simple ways to talk about Jesus with people you already love, starting with prayer.
- From Pastor Zac (46 words): Someone in your life needs to hear about Jesus, and I believe God put you near them on purpose. Write down their name and pray for them every day this month. Ask God for a chance to talk with them, and take it when it comes.

### May 2027

- Theme: Health
- Subject: Your May check-in: caring for your body
- Preheader: Pick one habit for your body this month and stay with it.
- Article: [A Brief Theology of Sleep](https://www.desiringgod.org/articles/a-brief-theology-of-sleep), John Piper, Desiring God
- Blurb: A short reflection on why God made us need rest every night.
- From Pastor Zac (52 words): Your body is a gift from God, and caring for it is part of following Jesus. You cannot give your best to your family, your work, or your calling when you are worn out. Choose one habit this month, whether that is sleep, movement, or how you eat, and stay with it.

### June 2027

- Theme: Contentment: rest
- Subject: Your June check-in: a day of rest
- Preheader: Protect one day each week for worship, people and rest.
- Article: [What Is the Sabbath in the Bible and Should Christians Observe It?](https://bibleproject.com/articles/keeping-the-sabbath-is-it-still-relevant-to-christians-today/), BibleProject
- Blurb: A six-minute walk through what the Bible says about a weekly day of rest.
- From Pastor Zac (52 words): God rested, and he invites you to rest with him. A weekly day of rest reminds you that God is in charge and that you can trust him with what is left undone. Protect one day each week this month for worship, for the people you love, and for things you enjoy.

### July 2027

- Theme: Starting again
- Subject: Your July check-in: start again
- Preheader: Halfway through the year is a good time to start again.
- Article: [Avoid the Second Mistake](https://jamesclear.com/second-mistake), James Clear
- Blurb: Missing once does not undo a habit. What matters is how quickly you start again.
- From Pastor Zac (46 words): Halfway through the year is a good time to be honest about where you are. If you have fallen behind on your plan, you have not failed, and God has not given up on you. Pick the smallest version of one habit and start again today.

### August 2027

- Theme: Faith: Scripture
- Subject: Your August check-in: ten minutes in Scripture
- Preheader: Open your Bible before you open your phone this month.
- Article: [How to Study the Bible for Beginners in 4 Simple Steps](https://finds.life.church/beginners-guide-to-studying-the-bible/), Life.Church
- Blurb: Where to begin and how to build a steady Bible habit.
- From Pastor Zac (52 words): God wants to speak to you through his Word every day. You will grow more from ten minutes in Scripture each morning than from an hour once in a while. Open your Bible before you open your phone this month, and ask God to show you one thing to put into practice.

### September 2027

- Theme: Finances
- Subject: Your September check-in: a plan for your money
- Preheader: Put giving first this month, then make a plan for the rest.
- Article: [How to Budget](https://www.ramseysolutions.com/budgeting/how-to-make-a-budget), Ramsey Solutions
- Blurb: A step-by-step guide to making a monthly budget before the month begins.
- From Pastor Zac (48 words): Money shapes what we care about, which is why Jesus talked about it so often. A plan for your money gives you room to breathe and room to be generous. I invite you to sit down this month, put giving first, and make a plan for the rest.

### October 2027

- Theme: Purpose: serving
- Subject: Your October check-in: use your gifts
- Preheader: The best way to find your gifts is to start serving.
- Article: [How do I discover my spiritual gift?](https://thegospelcoalition.org/article/how-do-i-discover-my-spiritual-gift), Juan Sanchez, The Gospel Coalition
- Blurb: The best way to find your gifts is to start serving where you are needed.
- From Pastor Zac (47 words): God gave you gifts that our church and our city need. Most people discover those gifts by serving, so the best next step is to start. Join the Winning Team this month, or take one new step where you already serve, and watch how God uses you.

### November 2027

- Theme: Contentment: gratitude
- Subject: Your November check-in: three things each day
- Preheader: Begin each day by thanking God for three specific things.
- Article: [Gratitude enhances health, brings happiness, and may even lengthen lives](https://www.health.harvard.edu/blog/gratitude-enhances-health-brings-happiness-and-may-even-lengthen-lives-202409113071), Harvard Health Publishing
- Blurb: Research on what a habit of giving thanks does for a person, with six questions to try.
- From Pastor Zac (38 words): Gratitude changes how you see everything God has already given you. Before this month gets busy, begin each day by thanking God for three specific things. I am thankful for you and for the way you keep growing.

### December 2027

- Theme: Looking back, looking ahead
- Subject: Your December check-in: look back, look ahead
- Preheader: Thank God for this year, then give him the next one.
- Article: [Ten Questions for a New Year](https://www.desiringgod.org/articles/ten-questions-for-a-new-year), Don Whitney, Desiring God
- Blurb: Ten questions to pray through as one year closes and the next begins.
- From Pastor Zac (52 words): Look back on this year and thank God for every step you took, including the small ones. Then look ahead and give him the whole year to come. Take time this month to review your plan and build your next one, because I believe your best growth is still ahead of you.

### Evergreen (when a month is missing)

- Theme: Keep going
- Subject: Your monthly check-in
- Preheader: A few minutes to look at your plan and take the next step.
- Article: [Avoid the Second Mistake](https://jamesclear.com/second-mistake), James Clear
- Blurb: Missing once does not undo a habit. What matters is how quickly you start again.
- From Pastor Zac (54 words): You belong to God, and he is patient with you as you grow. Take a few minutes this month to look at your plan and be honest about how it is going. Choose one habit to keep, and if one feels too big, make it smaller and keep going. I am cheering for you.
