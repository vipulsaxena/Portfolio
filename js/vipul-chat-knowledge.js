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
      id: "contact",
      patterns: [
        /\b(get in touch|contact you|reach you|talk to you|schedule|let's talk)\b/i,
        /\bhire you\b/i,
        /\bwork together\b/i,
        /\bavailable for hire\b/i,
        /\bare you available\b/i,
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
      ],
      action: "deflect_private",
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
    engineering_background:
      "Yes — I started as a CS Engineering graduate and did design engineering and mobile game UI early on (inoXapps). That background helps me prototype in code, speak fluently with engineers, and reason about feasibility.",
    years_experience:
      "12 years in product design — from mobile game UI and early startups in India to lead roles at Gojek, N26, OLX, and now Raisin in Berlin.",
    why_berlin:
      "I moved to Berlin to work at global scale. Here I've designed for tens of millions of users across dozens of markets — N26 across 25 countries, OLX across 17, Raisin across nine in Europe, the UK, and the US.",
    mentoring:
      "Yes — I mentor on ADPList. You can book a session from the Engage section on my homepage. I help with product design craft, career navigation, portfolio reviews, and design team practices.",
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
    personal_gaming:
      "Outside work I love stories that are deeply earned — especially Dark Souls (17 PlayStation platinums). Same patience and curiosity I bring to products. Also playing Baldur's Gate 3 and watching Jujutsu Kaisen.",
    
    // PUBLIC CASE STUDIES
    goplay:
      "I led product design for GoPlay — Gojek's OTT platform in Indonesia — from MVP to nationwide streaming on mobile, web, and Smart TV. Read the full public case study at https://vipulsaxena.com/goplay.html",
    instalively:
      "I was the first hire at InstaLively — live video streaming optimized for low-bandwidth environments in India, reaching 50k+ users before acquisition. Read the full story at https://vipulsaxena.com/instalively.html",
    ninja:
      "Silent Ninja Redesign focused on refining stealth-based game UI, controls, and user interaction patterns. Read the full case study at https://vipulsaxena.com/silent-ninja-redesign.html",
    hike:
      "At Hike, I authored the two-part UX case study 'Camera Is The New Keyboard' analyzing camera-first messaging, Hikemoji, and LiveDraw. Read Part 1 (https://uxplanet.org/camera-is-the-new-keyboard-77594daba99e) and Part 2 (https://uxplanet.org/camera-is-the-new-keyboard-part-2-19abc58d48f2) on UX Planet.",

    // LOCKED CASE STUDIES - TEASERS & FULL CONTENT
    raisin_public:
      "At Raisin I'm simplifying wealth management across EU, UK, and US — leading brand evolution across dashboard, mobile, email, and marketing for savers in nine markets.",
    raisin:
      "I led Raisin's brand evolution across dashboard, mobile app, email, and marketing — translating a global brand refresh into cohesive experiences across 12 markets while establishing design enablement workflows.",
    raisin_impact:
      "At Raisin the wins sit in shipping the Wealth Hub MVP across 12 markets with a coherent multi-surface experience, while standing up design enablement to reduce product fragmentation.",
    
    olx_public:
      "At OLX I led Engagement & Monetisation design in Pay & Ship — payments, seller monetisation, and checkout across 17 countries on a platform used by 317M+ people.",
    olx:
      "At OLX I led Engagement & Monetisation design in Pay & Ship across 17 countries — addressing Ad Package drop-off via research and A/B tests, AutoExtend, payment gateways, and DesignOps workshops.",
    olx_impact:
      "At OLX, impact came from reducing Ad Package drop-off through research and A/B tests, shipping Seller Take Rate AutoExtend, and optimizing checkout flows across 17 markets.",

    n26_public:
      "At N26 I evolved the home feed and transaction experience across 25 European markets — making multi-account activity easier to scan and act on.",
    n26:
      "At N26 I evolved the home feed into a multi-activity view across 25 European markets — surfacing activity across Spaces, IBANs, and cards, alongside MoneyBeam reactions and transaction search.",
    n26_impact:
      "At N26 the home feed work made multi-activity banking legible across 25 markets — eliminating dead ends between Spaces, IBANs, and cards.",

    gomart_public:
      "On Gojek I led grocery design at Indonesia scale — GoMart, GoFresh, and the operational tools behind reliable nationwide fulfillment.",
    gomart:
      "On Gojek I led grocery design at Indonesia scale — GoMart (B2C), GoFresh (B2B), plus shopper and driver tools using rapid design sprints for reliable fulfillment.",
    gomart_impact:
      "GoMart impact was about scaling reliable fulfillment in Indonesia — optimizing discovery, trust, and operational tools under real-world load.",
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
    var base = companyId.replace(/_public$|_impact$/, "").toLowerCase();
    return LOCKED_PROJECTS.indexOf(base) !== -1;
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

    var queryCompany = getCompanyFromQuery(query);
    var activeCompany = queryCompany || topicCompany;

    var results = [];
    Object.keys(CHUNKS).forEach(function (id) {
      if (excludeId && id === excludeId) return;
      if (/_impact$/.test(id) && !unlocked) return;
      
      var isLocked = isLockedProject(id);
      if (isLocked && !unlocked && !/_public$/.test(id)) return;

      var text = CHUNKS[id].toLowerCase();
      var score = 0;
      tokens.forEach(function (word) {
        var re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (re.test(text)) score += 1;
      });

      if (activeCompany) {
        var companyBase = id.replace(/_public$|_impact$/, "");
        if (companyBase === activeCompany && (queryCompany || isFollowUp(query) || wantsImpactMetrics(query) || wantsCaseStudyDepth(query))) {
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

  function expandQueryWithTopic(query, topicCompany) {
    if (!topicCompany) return query;
    if (getCompanyFromQuery(query)) return query;
    if (isFollowUp(query) || wantsImpactMetrics(query) || wantsCaseStudyDepth(query)) {
      return query + " " + topicCompany;
    }
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
    expandQueryWithTopic: expandQueryWithTopic,
  };
})(window);