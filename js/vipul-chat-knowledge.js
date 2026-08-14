(function (global) {
  "use strict";

  var SUGGESTED_CHIPS = [
    "What are you working on at Raisin?",
    "Tell me about your fintech experience",
    "How do I get the password?",
    "Why Berlin?",
    "Do you mentor on ADPList?",
  ];

  var COMPANIES = ["raisin", "olx", "n26", "gomart"];

  var DEPTH_PATTERNS = [
    /\b(case stud(y|ies)|deep dive|full story|more detail|go deeper|in depth)\b/i,
    /\b(process|approach|how did you|walk me through|methodology)\b/i,
    /\b(password.?gated|locked|full portfolio)\b/i,
    /\bgo deeper on\b/i,
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
    /\bwhat (did you|was) (achieve|deliver|ship)\b/i,
  ];

  var OVERVIEW_PATTERNS = [
    /\bwhat (are you|do you) (working on|do)\b/i,
    /\btell me about\b/i,
    /\boverview\b/i,
    /\bhigh[- ]?level\b/i,
    /\bcurrently\b/i,
  ];

  var INTENTS = [
    {
      id: "greeting",
      patterns: [/^(hi|hello|hey|yo|howdy)\b/i, /^good (morning|afternoon|evening)/i],
      answer:
        "Hey — I'm Vipul. Ask me about my work, background, case studies, or how to get in touch.",
    },
    {
      id: "who",
      patterns: [/\bwho are you\b/i, /\bwhat do you do\b/i, /\babout you\b/i],
      answer:
        "I'm Vipul Saxena — product designer and design enablement leader, Berlin-based, currently at Raisin. I make complex B2C products clearer for customers and easier for teams to build well. 12 years across fintech, marketplaces, streaming, and social.",
    },
    {
      id: "berlin",
      patterns: [/\bwhy berlin\b/i, /\bwhy germany\b/i, /\bindia.*indonesia.*germany\b/i, /\bmove(d)? to berlin\b/i],
      chunkId: "why_berlin",
    },
    {
      id: "password_how",
      patterns: [
        /\bhow (do|can) i get (the )?password\b/i,
        /\brequest (the )?password\b/i,
        /\bpassword please\b/i,
        /\baccess (to )?(your )?recent\b/i,
        /\bhow (can|do) i (access|see|view).*(work|portfolio|case stud)/i,
        /\b(access|see|view) your (work|portfolio)\b/i,
        /\bhow (can|do) i access\b/i,
        /\bget access\b/i,
      ],
      action: "request_access",
    },
    {
      id: "access_work",
      patterns: [
        /\b(recent|locked|password.?gated) (work|projects?|case stud)/i,
        /\bportfolio access\b/i,
      ],
      action: "request_access",
    },
    {
      id: "contact",
      patterns: [
        /\b(get in touch|contact you|reach you|talk to you|schedule|let's talk)\b/i,
        /\bhire you\b/i,
        /\bwork together\b/i,
      ],
      action: "collect_contact",
    },
    {
      id: "mentoring",
      patterns: [/\bmentor/i, /\badplist\b/i, /\bportfolio review\b/i],
      chunkId: "mentoring",
    },
    {
      id: "salary",
      patterns: [/\bsalary\b/i, /\bcompensation\b/i, /\brate\b/i, /\bnotice period\b/i, /\bvisa\b/i, /\bwork authorization\b/i, /\bactively looking\b/i],
      action: "deflect_private",
    },
    {
      id: "work_impact",
      patterns: IMPACT_PATTERNS,
      action: "impact_answer",
    },
    {
      id: "raisin",
      patterns: [/\braisin\b/i],
      chunkId: "raisin",
      locked: true,
    },
    {
      id: "olx",
      patterns: [/\bolx\b/i],
      chunkId: "olx",
      locked: true,
    },
    {
      id: "n26",
      patterns: [/\bn26\b/i],
      chunkId: "n26",
      locked: true,
    },
    {
      id: "gomart",
      patterns: [/\bgomart\b/i, /\bgojek.*grocery\b/i],
      chunkId: "gomart",
      locked: true,
    },
    {
      id: "goplay",
      patterns: [/\bgoplay\b/i, /\bott\b/i],
      chunkId: "goplay",
    },
    {
      id: "fintech",
      patterns: [/\bfintech\b/i, /\bbanking\b/i],
      chunkId: "fintech",
    },
    {
      id: "enablement",
      patterns: [/\benablement\b/i, /\bdesignops\b/i, /\bdesign (team|leadership)\b/i],
      chunkId: "enablement",
    },
    {
      id: "tools",
      patterns: [/\btools\b/i, /\bfigma\b/i, /\bai workflow\b/i, /\bcursor\b/i],
      chunkId: "tools",
    },
    {
      id: "experience",
      patterns: [/\bexperience\b/i, /\bresume\b/i, /\bcareer\b/i, /\bwork history\b/i],
      chunkId: "timeline",
    },
    {
      id: "personal",
      patterns: [/\bdark souls\b/i, /\bgaming\b/i, /\bgamer\b/i, /\bplatinum\b/i, /\breading\b/i, /\bplaying\b/i],
      chunkId: "personal",
    },
  ];

  var CHUNKS = {
    why_berlin:
      "I moved to Berlin to work at global scale. In India and Indonesia the companies I worked at had huge regional impact, but it was mostly Southeast Asia. Here I've designed for tens of millions of users across dozens of markets — N26 across 25 countries, OLX across 17, Raisin across nine in Europe, the UK, and the US.",
    mentoring:
      "Yes — I mentor on ADPList. You can book a session from the Engage section on my homepage. I help with product design craft, career navigation, portfolio reviews, and design team practices.",
    timeline:
      "2024–present: Raisin (Senior Product Designer, Berlin). 2022–2024: OLX Group. 2021–2022: N26. 2018–2021: Gojek (Lead PD, Jakarta). 2017–2018: Hike. 2014–2017: InstaLively (first hire, acquired by Hike). 2013–2014: GrownOut (acquired by PeopleStrong). Started in mobile game UI at inoXapps. CS Engineering background, design engineering early on.",
    fintech:
      "Most of my recent work is fintech: Raisin (wealth management, EU/UK/US), N26 (home feed across 25 markets), OLX Pay & Ship (monetisation, payments). I like making regulated, complex money products feel clear and trustworthy.",
    enablement:
      "I design products — and how the teams behind them work. At Raisin I've built research practice, AI workflows, quality standards, and coaching rituals alongside shipping product. Design systems, DesignOps, and critique culture are a big part of how I operate.",
    tools:
      "Figma, Sketch, Cursor, Claude Code, Maze, Marvin, UserTesting, Hotjar, Mixpanel, Dovetail, Miro, FigJam, Framer, ProtoPie, Spline, Blender — plus HTML/CSS/JS/React/Node when I need to build.",
    personal:
      "Outside work I love stories that are deeply earned — especially Dark Souls (17 PlayStation platinums). Same patience and curiosity I bring to products. Currently reading It Can't Happen Here, playing Baldur's Gate 3, watching Jujutsu Kaisen.",
    goplay:
      "I led product design for GoPlay — Gojek's OTT platform in Indonesia — from MVP to nationwide streaming on mobile, web, and Smart TV. Discovery was shaped through research and rapid experimentation; engagement lifted quarter over quarter. Full case study is public on my site.",
    hike:
      "At Hike I redesigned the AR camera and stories/timeline, filed IP around a media recommendation engine, and shipped Hikemoji, LiveDraw, and Hike Discover. 'Camera Is The New Keyboard' is a public UX case study on UX Planet.",
    instalively:
      "I was the first hire at InstaLively — live video for low-bandwidth India, 50k+ users, acquired by Hike. Also built Pulse (hyperlocal social for students) before that pivot.",
    raisin_public:
      "At Raisin I'm simplifying wealth management across EU, UK, and US — leading brand evolution across dashboard, mobile, email, and marketing for savers in nine markets. Right now I'm balancing shipping the Wealth Hub with building design enablement for the team.",
    raisin:
      "I led Raisin's brand evolution across dashboard, mobile app, email, and marketing — translating a global brand refresh into cohesive experiences. I ran two parallel tracks: shipping the Wealth Hub MVP across 12 markets, and building design enablement — research practice, AI workflows, governed email system, mobile alignment, and team rituals. Customers had faced fragmented surfaces; we turned static Koto guidelines into a living product system.",
    raisin_impact:
      "At Raisin the measurable wins sit in two tracks: shipping the Wealth Hub MVP across 12 markets with a coherent dashboard, mobile, and email experience — and standing up design enablement so the team could ship the rebrand without one-off reskins. Research practice, a governed email system, and mobile alignment reduced fragmentation customers felt across touchpoints. I can walk through specifics in a conversation.",
    olx_public:
      "At OLX I led Engagement & Monetisation design in Pay & Ship — payments, seller monetisation, and checkout across 17 countries on a platform used by 317M+ people.",
    olx:
      "At OLX I led Engagement & Monetisation design in Pay & Ship across 17 countries — Ad Package drop-off via research and A/B tests, Seller Take Rate AutoExtend, payment gateway, and DesignOps workshops. Platform serves 317M+ C2C and B2C users. Winning patterns rolled out to more markets.",
    olx_impact:
      "At OLX, impact came from tightening monetisation flows at scale: reducing Ad Package drop-off through research and A/B tests, shipping Seller Take Rate AutoExtend, and improving the payment gateway experience — then rolling winning patterns across more of the 17-country footprint.",
    n26_public:
      "At N26 I evolved the home feed and transaction experience across 25 European markets — making multi-account activity easier to scan and act on.",
    n26:
      "At N26 I evolved the home feed into a multi-activity view across 25 European markets — surfacing activity across Spaces, IBANs, and cards. Research-led: six customer interviews, cross-functional workshops, usability tests, launch-to-learn. Also shipped MoneyBeam reactions, feed↔crypto connections, and transaction search improvements.",
    n26_impact:
      "At N26 the home feed work made multi-activity banking legible across 25 markets — fewer dead ends between Spaces, IBANs, and cards. Research, workshops, and launch-to-learn cycles informed MoneyBeam reactions, feed↔crypto connections, and transaction search improvements.",
    gomart_public:
      "On Gojek I led grocery design at Indonesia scale — GoMart, GoFresh, and the operational tools behind reliable nationwide fulfillment.",
    gomart:
      "On Gojek I led grocery design at Indonesia scale — GoMart (B2C), GoFresh (B2B), plus shopper and driver tools. Studio Accelerator design sprints for fast, reliable fulfillment nationwide. Part of a broader on-demand and entertainment portfolio where I led a team of six.",
    gomart_impact:
      "GoMart impact was about reliable fulfillment at Indonesia scale — Studio Accelerator sprints across GoMart, GoFresh, and shopper/driver tools so discovery, trust, and operations held up under real-world load.",
  };

  var LOCKED_CHUNK_IDS = ["raisin", "olx", "n26", "gomart"];

  function wantsCaseStudyDepth(query) {
    return DEPTH_PATTERNS.some(function (p) { return p.test(query); });
  }

  function wantsImpactMetrics(query) {
    return IMPACT_PATTERNS.some(function (p) { return p.test(query); });
  }

  function isOverviewQuestion(query) {
    return OVERVIEW_PATTERNS.some(function (p) { return p.test(query); });
  }

  function getCompanyFromQuery(query) {
    var q = query.toLowerCase();
    for (var i = 0; i < COMPANIES.length; i++) {
      if (q.indexOf(COMPANIES[i]) !== -1) return COMPANIES[i];
    }
    return null;
  }

  function getPublicChunkId(companyId) {
    return companyId + "_public";
  }

  function getImpactChunkId(companyId) {
    return companyId + "_impact";
  }

  function searchChunks(query, unlocked, excludeId) {
    var q = query.toLowerCase();
    var results = [];
    Object.keys(CHUNKS).forEach(function (id) {
      if (excludeId && id === excludeId) return;
      if (/_impact$/.test(id) && !unlocked) return;
      var isLocked = LOCKED_CHUNK_IDS.indexOf(id) !== -1;
      if (isLocked && !unlocked) return;
      var text = CHUNKS[id].toLowerCase();
      var score = 0;
      q.split(/\s+/).forEach(function (word) {
        if (word.length > 2 && text.indexOf(word) !== -1) score += 1;
      });
      if (score > 0) results.push({ id: id, text: CHUNKS[id], score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });
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

  global.VipulChatKnowledge = {
    SUGGESTED_CHIPS: SUGGESTED_CHIPS,
    INTENTS: INTENTS,
    CHUNKS: CHUNKS,
    LOCKED_CHUNK_IDS: LOCKED_CHUNK_IDS,
    COMPANIES: COMPANIES,
    searchChunks: searchChunks,
    matchIntent: matchIntent,
    wantsCaseStudyDepth: wantsCaseStudyDepth,
    wantsImpactMetrics: wantsImpactMetrics,
    isOverviewQuestion: isOverviewQuestion,
    getCompanyFromQuery: getCompanyFromQuery,
    getPublicChunkId: getPublicChunkId,
    getImpactChunkId: getImpactChunkId,
  };
})(window);
