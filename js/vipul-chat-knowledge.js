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
    /\b(case stud(y|ies)|deep dive|full story|more detail|go deeper|in depth)\b/i,
    /\b(process|how did you|walk me through)\b/i,
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
    /^(more|more\?|go on|continue|and\?|ok and\?)$/i,
    /^(tell me more|say more|go deeper|elaborate)\.?$/i,
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
      id: "design_approach",
      patterns: [
        /\bdesign approach\b/i,
        /\bhow do you (design|approach design)\b/i,
        /\byour (design )?philosophy\b/i,
        /\bhow do you work\b/i,
        /\bdesign process\b/i,
      ],
      chunkId: "design_approach",
    },
    {
      id: "education",
      patterns: [
        /\bwhere did you study\b/i,
        /\bwhere (did you|do you) (go to )?school\b/i,
        /\beducation\b/i,
        /\buniversity\b/i,
        /\bcollege\b/i,
        /\bdegree\b/i,
        /\bstudied\b/i,
      ],
      chunkId: "education",
    },
    {
      id: "engineering_background",
      patterns: [
        /\b(engineer|engineering) (background|before)\b/i,
        /\bwere you (an? )?engineer\b/i,
        /\bcs (background|degree|engineering)\b/i,
        /\bcoding background\b/i,
        /\btechnical background\b/i,
      ],
      chunkId: "engineering_background",
    },
    {
      id: "years_experience",
      patterns: [
        /\b(how many|total|number of)\s+years?\b/i,
        /\byears? of experience\b/i,
        /\bhow long have you\b/i,
        /\b(\d+)\+?\s*years?\b/i,
        /\byoe\b/i,
      ],
      chunkId: "years_experience",
    },
    {
      id: "berlin",
      patterns: [
        /\bwhy berlin\b/i,
        /\bwhy germany\b/i,
        /\bindia.*indonesia.*germany\b/i,
        /\bmove(d)? to berlin\b/i,
      ],
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
      patterns: [
        /\bsalary\b/i,
        /\bcompensation\b/i,
        /\bnotice period\b/i,
        /\bvisa\b/i,
        /\bwork authorization\b/i,
        /\bactively looking\b/i,
        /\bexpected (salary|rate|comp)\b/i,
      ],
      action: "deflect_private",
    },
    {
      id: "work_impact",
      patterns: IMPACT_PATTERNS,
      action: "impact_answer",
    },
    {
      id: "reading",
      patterns: [
        /\bwhat (are you|do you) reading\b/i,
        /\b(currently )?reading\b/i,
        /\bbooks?\b/i,
      ],
      chunkId: "personal_reading",
    },
    {
      id: "gaming",
      patterns: [/\bdark souls\b/i, /\bgaming\b/i, /\bgamer\b/i, /\bplatinum\b/i, /\bplaying\b/i],
      chunkId: "personal_gaming",
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
      patterns: [/\bexperience\b/i, /\bresume\b/i, /\bcareer\b/i, /\bwork history\b/i, /\btimeline\b/i],
      chunkId: "timeline",
    },
  ];

  var CHUNKS = {
    design_approach:
      "I start with the problem and the people affected — research, constraints, and what 'good' looks like for customers and the business. Then I shape flows and interfaces that reduce cognitive load, validate early with prototypes and tests, and ship in tight loops with engineering and product. I care as much about coherence across touchpoints as about the pixels — especially in regulated, multi-market products.",
    education:
      "I studied Computer Science Engineering in India — that technical foundation still shapes how I work with engineers, prototypes, and design systems. I moved into product design early in my career and have been designing B2C products for 12 years since.",
    engineering_background:
      "Yes — I started as a CS Engineering graduate and did design engineering and mobile game UI early on (inoXapps). That background helps me prototype in code, speak fluently with engineers, and reason about feasibility — even though product design is my craft today.",
    years_experience:
      "12 years in product design — from mobile game UI and early startups in India to lead roles at Gojek, N26, OLX, and now Raisin in Berlin. Happy to walk through the timeline if useful.",
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
    personal_reading:
      "Right now I'm reading It Can't Happen Here — and I usually rotate between fiction, design, and history depending on what I'm curious about.",
    personal_gaming:
      "Outside work I love stories that are deeply earned — especially Dark Souls (17 PlayStation platinums). Same patience and curiosity I bring to products. Also playing Baldur's Gate 3 and watching Jujutsu Kaisen.",
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

  function getCompanyFromChunkId(chunkId) {
    if (!chunkId) return null;
    var base = chunkId.replace(/_public$|_impact$/, "");
    if (COMPANIES.indexOf(base) !== -1) return base;
    return null;
  }

  function getPublicChunkId(companyId) {
    return companyId + "_public";
  }

  function getImpactChunkId(companyId) {
    return companyId + "_impact";
  }

  function searchChunks(query, unlocked, excludeId, topicCompany) {
    var tokens = tokenizeQuery(query);
    if (!tokens.length) return [];

    var results = [];
    Object.keys(CHUNKS).forEach(function (id) {
      if (excludeId && id === excludeId) return;
      if (/_impact$/.test(id) && !unlocked) return;
      var isLocked = LOCKED_CHUNK_IDS.indexOf(id) !== -1;
      if (isLocked && !unlocked) return;

      var text = CHUNKS[id].toLowerCase();
      var score = 0;
      tokens.forEach(function (word) {
        var re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (re.test(text)) score += 1;
      });

      if (topicCompany) {
        var companyBase = id.replace(/_public$|_impact$/, "");
        if (companyBase === topicCompany) score += 3;
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

  function expandQueryWithTopic(query, topicCompany) {
    if (!topicCompany) return query;
    if (getCompanyFromQuery(query)) return query;
    if (isFollowUp(query) || wantsImpactMetrics(query) || wantsCaseStudyDepth(query)) {
      return query + " " + topicCompany;
    }
    if (/\basking about\b/i.test(query)) {
      return query;
    }
    return query;
  }

  global.VipulChatKnowledge = {
    SUGGESTED_CHIPS: SUGGESTED_CHIPS,
    INTENTS: INTENTS,
    CHUNKS: CHUNKS,
    LOCKED_CHUNK_IDS: LOCKED_CHUNK_IDS,
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
    getCompanyFromChunkId: getCompanyFromChunkId,
    getPublicChunkId: getPublicChunkId,
    getImpactChunkId: getImpactChunkId,
    expandQueryWithTopic: expandQueryWithTopic,
  };
})(window);
