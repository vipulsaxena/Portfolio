(function (global) {
  "use strict";

  var SUGGESTED_CHIPS = [
    "What are you working on at Raisin?",
    "Tell me about your fintech experience",
    "How do I get the password?",
    "Why Berlin?",
    "Do you mentor on ADPList?",
  ];

  var LOCKED_PROJECTS = ["raisin", "olx", "n26", "gomart"];
  var PUBLIC_PROJECTS = ["goplay", "instalively", "ninja", "hike"];
  var COMPANIES = LOCKED_PROJECTS.concat(PUBLIC_PROJECTS);

  var STOPWORDS = {
    the: 1, a: 1, an: 1, and: 1, or: 1, but: 1, in: 1, on: 1, at: 1, to: 1, for: 1,
    of: 1, with: 1, by: 1, from: 1, as: 1, is: 1, are: 1, was: 1, were: 1, be: 1, been: 1,
    being: 1, have: 1, has: 1, had: 1, do: 1, does: 1, did: 1, will: 1, would: 1, could: 1,
    should: 1, may: 1, might: 1, must: 1, can: 1, i: 1, me: 1, my: 1, you: 1, your: 1,
    we: 1, our: 1, they: 1, them: 1, their: 1, it: 1, its: 1, this: 1, that: 1, these: 1,
    those: 1, what: 1, which: 1, who: 1, whom: 1, whose: 1, where: 1, when: 1, why: 1, how: 1,
    about: 1, just: 1, only: 1, also: 1, very: 1, really: 1, please: 1, tell: 1, know: 1,
    like: 1, get: 1, got: 1, give: 1, want: 1, need: 1, any: 1, some: 1, much: 1, many: 1,
  };

  var DEPTH_PATTERNS = [
    /\b(case stud(y|ies)|deep dive|full story|more detail|go deeper|in depth|summary)\b/i,
    /\b(process|how did you|walk me through)\b/i,
    /\bgo deeper on\b/i,
    /\b(user |customer )?problem\b/i,
    /\bproblem statement\b/i,
    /\bresearch\b/i,
    /\bshipped\b/i,
  ];

  var IMPACT_PATTERNS = [
    /\bimpact\b/i,
    /\bresults?\b/i,
    /\boutcomes?\b/i,
    /\bmetrics?\b/i,
    /\bmeasurable\b/i,
    /\broi\b/i,
    /\bconversion\b/i,
    /\blift\b/i,
    /\bimprov(e|ed|ement)\b/i,
    /\bwhat (did you|was) (achieve|deliver|ship|generate)\b/i,
  ];

  var OVERVIEW_PATTERNS = [
    /\bwhat (are you|do you) (working on|do)\b/i,
    /\btell me about\b/i,
    /\boverview\b/i,
    /\bhigh[- ]?level\b/i,
    /\bcurrently\b/i,
    /\b(latest|recent) work\b/i,
  ];

  var FOLLOWUP_PATTERNS = [
    /^(more|more\?|go on|continue|and\?|ok and\?|sure|ok)$/i,
    /^(tell me more|say more|go deeper|elaborate|lets go deeper|let's go deeper)\.?$/i,
    /^what else\??$/i,
  ];

  var FRUSTRATION_PATTERNS = [
    /\bdoesn'?t answer\b/i,
    /\bnot what i (asked|meant)\b/i,
    /\bwrong answer\b/i,
    /\bthat'?s not (what|my)\b/i,
    /\bi only asked\b/i,
    /\byou didn'?t answer\b/i,
    /\bthat doesn'?t help\b/i,
    /\bnot helpful\b/i,
    /\bnot relevant\b/i,
    /\blost it\b/i,
    /\bwrong project\b/i,
    /\b(answers|responses) (are )?(not|weird)\b/i,
    /\bi (am )?asking about\b/i,
    /\blocked case stud/i,
    /\bonly telling me about\b/i,
  ];

  var INTENTS = [
    {
      id: "greeting",
      patterns: [
        /^(hi|hello|hey|yo|howdy)[\s!.]*$/i,
        /^good (morning|afternoon|evening)[\s!.]*$/i,
      ],
      answer:
        "Hey — I'm Vipul. Ask me about my work, background, case studies, or how to get in touch.",
    },
    {
      id: "who",
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\babout you\b/i, /\babout vipul\b/i],
      answer:
        "I'm Vipul Saxena — product designer and design enablement leader, Berlin-based, currently at Raisin. I make complex B2C products clearer for customers and easier for teams to build well. 12 years across fintech, marketplaces, streaming, and social.",
    },
    {
      id: "password_how",
      patterns: [
        /\bhow (do|can) i get (the )?password\b/i,
        /\bcan i get (the )?password\b/i,
        /\brequest (the )?password\b/i,
        /\bpassword please\b/i,
        /\bpassword (to|for) (enter )?(the )?(case stud(y|ies)|portfolio)\b/i,
        /\b(get|give me|want) (the )?password\b/i,
        /\bgive me access\b/i,
        /\baccess (to )?(your )?recent\b/i,
        /\bhow (can|do) i (access|see|view).*(work|portfolio|case stud)/i,
        /\b(access|see|view) your (work|portfolio)\b/i,
        /\bhow (can|do) i access\b/i,
        /\bget access\b/i,
      ],
      action: "request_access",
    },
    {
      id: "contact",
      patterns: [
        /\b(get in touch|contact you|reach you|talk to you|schedule|let's talk)\b/i,
        /\bhire you\b/i,
        /\bwork together\b/i,
        /\bavailable for hire\b/i,
        /\bare you available\b/i,
        /\btalk to vipul\b/i,
        /\btalk to you\b/i,
      ],
      action: "collect_contact",
    },
    {
      id: "salary",
      patterns: [
        /\bsalary\b/i,
        /\bcompensation\b/i,
        /\bnotice period\b/i,
        /\bvisa\b/i,
        /\bwork authorization\b/i,
        /\bactively looking\b/i,
        /\bexpected (salary|rate|comp)\b/i,
        /\brights? to work\b/i,
        /\bwork(ing)? (in )?(the )?eu\b/i,
      ],
      action: "deflect_private",
    },
    {
      id: "design_approach",
      patterns: [
        /\bdesign approach\b/i,
        /\bhow do you design\b/i,
        /\bproduct design process\b/i,
        /\bdesign philosophy\b/i,
        /\btech debt\b/i,
      ],
      chunkId: "design_approach",
    },
    {
      id: "education",
      patterns: [
        /\bwhere did you study\b/i,
        /\bwhat did you study\b/i,
        /\beducation\b/i,
        /\bdegree\b/i,
        /\buniversity\b/i,
      ],
      chunkId: "education",
    },
    {
      id: "origin",
      patterns: [/\bwhere are you from\b/i, /\bwhere (do|did) you (grow|come) from\b/i, /\bhome town\b/i],
      chunkId: "origin",
    },
    {
      id: "engineering_background",
      patterns: [
        /\bengineer(ing)? background\b/i,
        /\b(were you|you) an? engineer\b/i,
        /\bengineer before\b/i,
        /\bcs (degree|background)\b/i,
      ],
      chunkId: "engineering_background",
    },
    {
      id: "years_experience",
      patterns: [/\byears? of experience\b/i, /\bhow long have you\b/i, /\bexperience do you have\b/i],
      chunkId: "years_experience",
    },
    {
      id: "berlin",
      patterns: [/\bwhy berlin\b/i, /\bwhy did you move\b/i, /\bwhy (are you|live) in berlin\b/i],
      chunkId: "why_berlin",
    },
    {
      id: "mentoring",
      patterns: [/\bmentor(ing|ship)?\b/i, /\badplist\b/i],
      chunkId: "mentoring",
    },
    {
      id: "reading",
      patterns: [/\bwhat (are you|do you) read(ing)?\b/i, /\breading\b/i, /\bbook\b/i],
      chunkId: "personal_reading",
    },
    {
      id: "hobbies",
      patterns: [/\bhobb(y|ies)\b/i, /\bfree time\b/i, /\boutside (of )?work\b/i],
      chunkId: "personal_hobbies",
    },
    {
      id: "gaming",
      patterns: [/\bgaming\b/i, /\bplay(ing)? games\b/i, /\bdark souls\b/i, /\bbaldur'?s gate\b/i],
      chunkId: "personal_gaming",
    },
    {
      id: "list_projects",
      patterns: [
        /\blist (down )?(the |your )?projects\b/i,
        /\ball (the )?projects\b/i,
        /\bhow many projects\b/i,
        /\bprojects (have you|you have) worked\b/i,
        /\bacross (your )?work\b/i,
        /\bnot just\b/i,
        /\bbut across\b/i,
      ],
      chunkId: "list_projects",
    },
    {
      id: "using_ai",
      patterns: [
        /\bare you using ai\b/i,
        /\bis this (an? )?ai\b/i,
        /\busing ai\??$/i,
        /\b(this|the) chatbot\b/i,
      ],
      chunkId: "using_ai",
    },
    {
      id: "fintech",
      patterns: [/\bfintech experience\b/i, /\bfintech work\b/i, /\bfinancial (products|services)\b/i],
      chunkId: "fintech",
    },
    {
      id: "work_impact",
      patterns: [
        /\bimpact (at|on|you|generated)\b/i,
        /\bwhat (was|were) the (impact|results|outcomes)\b/i,
        /\bmeasurable (wins|results)\b/i,
      ],
    },
    // Locked Projects
    { id: "raisin", patterns: [/\braisin\b/i], chunkId: "raisin", locked: true },
    { id: "olx", patterns: [/\bolx\b/i], chunkId: "olx", locked: true },
    { id: "n26", patterns: [/\bn26\b/i], chunkId: "n26", locked: true },
    { id: "gomart", patterns: [/\bgomart\b/i, /\bgojek.*grocery\b/i], chunkId: "gomart", locked: true },
    // Public Projects
    { id: "goplay", patterns: [/\bgoplay\b/i, /\bott\b/i], chunkId: "goplay", locked: false },
    { id: "instalively", patterns: [/\binstalively\b/i], chunkId: "instalively", locked: false },
    { id: "ninja", patterns: [/\bsilent ninja\b/i, /\bninja redesign\b/i], chunkId: "ninja", locked: false },
    { id: "hike", patterns: [/\bhike\b/i, /\bcamera is the new keyboard\b/i, /\bhikemoji\b/i], chunkId: "hike", locked: false },
  ];

  var CHUNKS = {
    design_approach:
      "I start with the problem and the people affected — research, constraints, and what 'good' looks like for customers and the business. Then I shape flows and interfaces that reduce cognitive load, validate early with prototypes and tests, and ship in tight loops with engineering and product.",
    education:
      "I studied Computer Science Engineering in India — that technical foundation still shapes how I work with engineers, prototypes, and design systems. I moved into product design early in my career and have been designing B2C products for 12 years since.",
    origin:
      "I'm based in Berlin. I grew up and studied in India — Computer Science Engineering — then worked across Asia before moving to Europe for global-scale product work.",
    engineering_background:
      "Yes — I started as a CS Engineering graduate and did design engineering and mobile game UI early on (inoXapps). That background helps me prototype in code, speak fluently with engineers, and reason about feasibility.",
    years_experience:
      "12 years in product design — from mobile game UI and early startups in India to lead roles at Gojek, N26, OLX, and now Raisin in Berlin.",
    why_berlin:
      "I moved to Berlin to work at global scale. Here I've designed for tens of millions of users across dozens of markets — N26 across 25 countries, OLX across 17, Raisin across nine in Europe, the UK, and the US.",
    mentoring:
      "Yes — I mentor on ADPList. I help with product design craft, career navigation, portfolio reviews, and design team practices.",
    timeline:
      "2024–present: Raisin (Senior Product Designer, Berlin). 2022–2024: OLX Group. 2021–2022: N26. 2018–2021: Gojek (Lead PD, Jakarta). 2017–2018: Hike. 2014–2017: InstaLively. Started in mobile game UI at inoXapps.",
    fintech:
      "Most of my recent work is fintech: Raisin (wealth management, EU/UK/US), N26 (home feed across 25 markets), OLX Pay & Ship (monetisation, payments). I like making regulated, complex money products feel clear and trustworthy.",
    enablement:
      "I design products — and how the teams behind them work. At Raisin I've built research practice, AI workflows, quality standards, and coaching rituals alongside shipping product.",
    tools:
      "Figma, Sketch, Cursor, Claude Code, Maze, Marvin, UserTesting, Hotjar, Mixpanel, Dovetail, Miro, FigJam, Framer, ProtoPie, Spline, Blender — plus HTML/CSS/JS/React/Node when I need to build.",
    personal_reading:
      "Right now I'm reading It Can't Happen Here — and I usually rotate between fiction, design, and history depending on what I'm curious about.",
    personal_hobbies:
      "Outside work I read (currently It Can't Happen Here), play games — especially Dark Souls (17 PlayStation platinums) and Baldur's Gate 3 — and watch Jujutsu Kaisen.",
    personal_gaming:
      "Outside work I love stories that are deeply earned — especially Dark Souls (17 PlayStation platinums). Same patience and curiosity I bring to products. Also playing Baldur's Gate 3 and watching Jujutsu Kaisen.",
    list_projects:
      "Recent locked case studies (password-gated for depth): Raisin, OLX, N26, and GoMart. Public work I can discuss fully here: GoPlay, InstaLively, Silent Ninja Redesign, and Hike's camera-first messaging case study. Earlier: GrownOut and mobile game UI at inoXapps.",
    using_ai:
      "This chat uses AI to help me answer from my portfolio knowledge — I still review leads myself. In my work I also use AI-native prototyping (Cursor and similar) alongside research and Figma. If you'd rather talk to me directly, leave your email here.",
    
    // PUBLIC CASE STUDIES (answer in chat — no links)
    goplay:
      "I led product design for GoPlay — Gojek's OTT platform in Indonesia — from MVP to nationwide streaming across mobile, web, and Smart TV. I designed the core video playback experience, content discovery, localized UI/UX for low and high bandwidth conditions, and Smart TV navigation patterns.",
    instalively:
      "I was the first hire at InstaLively, designing live video streaming software optimized for low-bandwidth environments in India. I designed real-time low-latency streaming interfaces, streamer onboarding, and live audience interaction (chat and donations). The product grew to 50k+ active users before acquisition by Hike.",
    ninja:
      "Silent Ninja Redesign was a mobile game UI/UX redesign focused on stealth action mechanics. I refined HUD clarity, touch control ergonomics, menu navigation, and reduced interface clutter during active gameplay to maximize player immersion.",
    hike:
      "At Hike I authored a two-part UX case study on the camera-first messaging overhaul — 'Camera Is The New Keyboard.' The work focused on transitioning users from text-first to visual communication: Hikemoji avatar creation and customization, LiveDraw's real-time interactive canvas, and camera creation interfaces.",

    // LOCKED CASE STUDIES - TEASERS & FULL CONTENT
    raisin_public:
      "At Raisin I'm simplifying wealth management across EU, UK, and US — leading brand evolution across dashboard, mobile, email, and marketing for savers in nine markets.",
    raisin:
      "I led Raisin's brand evolution across dashboard, mobile app, email, and marketing — translating a global brand refresh into cohesive experiences. I ran two parallel tracks: shipping the Wealth Hub MVP across 12 markets, and building design enablement — research practice, AI workflows, governed email system, mobile alignment, and team rituals. Customers had faced fragmented surfaces; we turned static Koto guidelines into a living product system.",
    raisin_impact:
      "At Raisin the measurable wins sit in two tracks: shipping the Wealth Hub MVP across 12 markets with a coherent dashboard, mobile, and email experience — and standing up design enablement so the team could ship the rebrand without one-off reskins. Research practice, a governed email system, and mobile alignment reduced fragmentation customers felt across touchpoints.",
    raisin_problem:
      "At Raisin the customer problem was fragmented surfaces — dashboard, mobile, email, and marketing didn't feel like one product after the brand refresh. Static Koto guidelines weren't enough; savers needed a coherent wealth experience, so we ran Wealth Hub MVP across 12 markets in parallel with design enablement so the team could ship without one-off reskins.",
    
    olx_public:
      "At OLX I led Engagement & Monetisation design in Pay & Ship — payments, seller monetisation, and checkout across 17 countries on a platform used by 317M+ people.",
    olx:
      "At OLX I led Engagement & Monetisation design in Pay & Ship across 17 countries — Ad Package drop-off via research and A/B tests, Seller Take Rate AutoExtend, payment gateway, and DesignOps workshops. Platform serves 317M+ C2C and B2C users. Winning patterns rolled out to more markets.",
    olx_impact:
      "At OLX, impact came from tightening monetisation flows at scale: reducing Ad Package drop-off through research and A/B tests, shipping Seller Take Rate AutoExtend, and improving the payment gateway experience — then rolling winning patterns across more of the 17-country footprint.",

    n26_public:
      "At N26 I evolved the home feed and transaction experience across 25 European markets — making multi-account activity easier to scan and act on.",
    n26:
      "At N26 I evolved the home feed into a multi-activity view across 25 European markets — surfacing activity across Spaces, IBANs, and cards. Research-led: customer interviews, cross-functional workshops, usability tests, launch-to-learn. Also shipped MoneyBeam reactions, feed↔crypto connections, and transaction search improvements.",
    n26_impact:
      "At N26 the home feed work made multi-activity banking legible across 25 markets — fewer dead ends between Spaces, IBANs, and cards. Research, workshops, and launch-to-learn cycles informed MoneyBeam reactions, feed↔crypto connections, and transaction search improvements.",
    n26_problem:
      "At N26 the user problem was a home feed that didn't make multi-account activity easy to scan or act on across Spaces, IBANs, and cards. We used customer interviews, cross-functional workshops, usability tests, and launch-to-learn — I don't list the 25 European market names here.",

    gomart_public:
      "On Gojek I led grocery design at Indonesia scale — GoMart, GoFresh, and the operational tools behind reliable nationwide fulfillment.",
    gomart:
      "On Gojek I led grocery design at Indonesia scale — GoMart (B2C), GoFresh (B2B), plus shopper and driver tools. Studio Accelerator design sprints for fast, reliable fulfillment nationwide. Part of a broader on-demand and entertainment portfolio where I led a team of six.",
    gomart_impact:
      "GoMart impact was about reliable fulfillment at Indonesia scale — Studio Accelerator sprints across GoMart, GoFresh, and shopper/driver tools so discovery, trust, and operations held up under real-world load.",
    gomart_problem:
      "On GoMart the problem was grocery fulfillment at Indonesia scale — discovery, trust, and operations for GoMart (B2C) and GoFresh (B2B), plus the shopper and driver tools behind nationwide delivery. Studio Accelerator sprints were how we moved fast without dropping reliability.",
  };

  function tokenizeQuery(query) {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(function (word) {
        return word.length > 2 && !STOPWORDS[word];
      });
  }

  function wantsCaseStudyDepth(query) {
    return DEPTH_PATTERNS.some(function (p) { return p.test(query); });
  }

  function wantsImpactMetrics(query) {
    return IMPACT_PATTERNS.some(function (p) { return p.test(query); });
  }

  function isOverviewQuestion(query) {
    return OVERVIEW_PATTERNS.some(function (p) { return p.test(query); });
  }

  function isFollowUp(query) {
    if (FOLLOWUP_PATTERNS.some(function (p) { return p.test(query.trim()); })) return true;
    if (/^(more|more\?)$/i.test(query.trim())) return true;
    return false;
  }

  function isFrustration(query) {
    return FRUSTRATION_PATTERNS.some(function (p) { return p.test(query); });
  }

  function getCompanyFromQuery(query) {
    var q = query.toLowerCase();
    for (var i = 0; i < COMPANIES.length; i++) {
      if (q.indexOf(COMPANIES[i]) !== -1) return COMPANIES[i];
    }
    return null;
  }

  function isLockedProject(companyId) {
    if (!companyId) return false;
    var base = companyId.replace(/_public$|_impact$|_problem$/, "").toLowerCase();
    return LOCKED_PROJECTS.indexOf(base) !== -1;
  }

  function getCompanyFromChunkId(chunkId) {
    if (!chunkId) return null;
    var base = chunkId.replace(/_public$|_impact$|_problem$/, "");
    if (COMPANIES.indexOf(base) !== -1) return base;
    return null;
  }

  function getPublicChunkId(companyId) {
    return companyId + "_public";
  }

  function getImpactChunkId(companyId) {
    return companyId + "_impact";
  }

  function getProblemChunkId(companyId) {
    return companyId + "_problem";
  }

  function wantsProblemDetail(query) {
    return /\b(user |customer )?problem\b/i.test(query) || /\bproblem statement\b/i.test(query);
  }

  function shouldResetTopic(query) {
    if (!query) return false;
    if (isFrustration(query)) return true;
    return /\b(bye|goodbye|hobb(y|ies)|free time|gaming|reading|all projects|list (down )?(the |your )?projects|not just|philosophy|tech debt|hire you|available for hire|get in touch|password|request access)\b/i.test(
      query
    );
  }

  function wantsTopicFollowUp(query) {
    if (/\blocked case stud/i.test(query) || /\bonly telling me about\b/i.test(query)) return false;
    return isFollowUp(query) || wantsImpactMetrics(query) || wantsCaseStudyDepth(query) || wantsProblemDetail(query);
  }

  function looksLikeWorkQuestion(text) {
    if (!text) return false;
    if (/\?/.test(text)) return true;
    if (getCompanyFromQuery(text) && /\b(how many|what|why|currently|did you|are you|impact|problem|headcount|under you)\b/i.test(text)) {
      return true;
    }
    if (/\b(how many people|headcount|team size|work under you|report(s|ing) to you)\b/i.test(text)) return true;
    var intent = matchIntent(text);
    if (!intent) return false;
    if (intent.action === "collect_contact" || intent.action === "request_access") return false;
    return true;
  }

  function pickCompanyChunkId(companyId, query, unlocked) {
    if (!companyId) return null;
    if (wantsImpactMetrics(query) && CHUNKS[companyId + "_impact"]) {
      return unlocked || !isLockedProject(companyId) ? companyId + "_impact" : companyId + "_public";
    }
    if (wantsProblemDetail(query) && CHUNKS[companyId + "_problem"]) {
      return unlocked || !isLockedProject(companyId) ? companyId + "_problem" : companyId + "_public";
    }
    if (isLockedProject(companyId) && !unlocked) return companyId + "_public";
    if (CHUNKS[companyId]) return companyId;
    return null;
  }

  function searchChunks(query, unlocked, excludeId, topicCompany) {
    var tokens = tokenizeQuery(query);
    if (!tokens.length) return [];

    var queryCompany = getCompanyFromQuery(query);
    var activeCompany = queryCompany || topicCompany;
    var topicFollow = wantsTopicFollowUp(query);

    var results = [];
    Object.keys(CHUNKS).forEach(function (id) {
      if (excludeId && id === excludeId) return;
      if (/_impact$|_problem$/.test(id) && !unlocked) return;

      var isLocked = isLockedProject(id);
      if (isLocked && !unlocked && !/_public$/.test(id)) return;

      var text = CHUNKS[id].toLowerCase();
      var score = 0;
      tokens.forEach(function (word) {
        var re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (re.test(text)) score += 1;
      });

      if (activeCompany) {
        var companyBase = id.replace(/_public$|_impact$|_problem$/, "");
        if (companyBase === activeCompany && (queryCompany || topicFollow)) {
          score += 2;
        }
      }

      if (score > 0) results.push({ id: id, text: CHUNKS[id], score: score });
    });

    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.length - b.id.length;
    });
    return results;
  }

  function matchIntent(query) {
    for (var i = 0; i < INTENTS.length; i++) {
      var intent = INTENTS[i];
      for (var j = 0; j < intent.patterns.length; j++) {
        if (intent.patterns[j].test(query)) return intent;
      }
    }
    return null;
  }

  function expandQueryWithTopic(query) {
    return query;
  }

  global.VipulChatKnowledge = {
    SUGGESTED_CHIPS: SUGGESTED_CHIPS,
    INTENTS: INTENTS,
    CHUNKS: CHUNKS,
    LOCKED_PROJECTS: LOCKED_PROJECTS,
    PUBLIC_PROJECTS: PUBLIC_PROJECTS,
    COMPANIES: COMPANIES,
    STOPWORDS: STOPWORDS,
    searchChunks: searchChunks,
    matchIntent: matchIntent,
    tokenizeQuery: tokenizeQuery,
    wantsCaseStudyDepth: wantsCaseStudyDepth,
    wantsImpactMetrics: wantsImpactMetrics,
    isOverviewQuestion: isOverviewQuestion,
    isFollowUp: isFollowUp,
    isFrustration: isFrustration,
    getCompanyFromQuery: getCompanyFromQuery,
    isLockedProject: isLockedProject,
    getCompanyFromChunkId: getCompanyFromChunkId,
    getPublicChunkId: getPublicChunkId,
    getImpactChunkId: getImpactChunkId,
    getProblemChunkId: getProblemChunkId,
    expandQueryWithTopic: expandQueryWithTopic,
    shouldResetTopic: shouldResetTopic,
    wantsTopicFollowUp: wantsTopicFollowUp,
    looksLikeWorkQuestion: looksLikeWorkQuestion,
    wantsProblemDetail: wantsProblemDetail,
    pickCompanyChunkId: pickCompanyChunkId,
  };
})(window);