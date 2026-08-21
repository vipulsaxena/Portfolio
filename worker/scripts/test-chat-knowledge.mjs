#!/usr/bin/env node
/**
 * Regression tests for chat knowledge routing (no API required)
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(__dirname, "../../js/vipul-chat-knowledge.js"), "utf8");
const global = {};
eval(code.replace("window", "global"));
const K = global.VipulChatKnowledge;

const cases = [
  {
    q: "What is your design approach?",
    expectIntent: "design_approach",
    notChunk: "why_berlin",
  },
  {
    q: "Where did you study?",
    expectIntent: "education",
    notChunk: "mentoring",
  },
  {
    q: "What did you study?",
    expectIntent: "education",
  },
  {
    q: "Where you a engineer before?",
    expectIntent: "engineering_background",
    notChunk: "mentoring",
  },
  {
    q: "your total year of experience?",
    expectIntent: "years_experience",
    notChunk: "timeline",
  },
  {
    q: "What are you reading?",
    expectIntent: "reading",
    notChunk: "personal_gaming",
  },
  {
    q: "what do you like to do in your free time?",
    expectIntent: "hobbies",
  },
  {
    q: "more",
    expectFollowUp: true,
    searchNotTop: "olx",
  },
  {
    q: "what was the impact you generated at Raisin?",
    expectIntent: "work_impact",
  },
  {
    q: "Tell me about Raisin",
    expectIntent: "raisin",
  },
  {
    q: "Tell me about GoPlay",
    expectIntent: "goplay",
    chunkHasNoHttp: "goplay",
  },
  {
    q: "How do I get the password?",
    expectIntent: "password_how",
  },
  {
    q: "can i get the password?",
    expectIntent: "password_how",
  },
  {
    q: "password to enter case study?",
    expectIntent: "password_how",
  },
  {
    q: "give me access to olx portfolio",
    expectIntent: "password_how",
  },
  {
    q: "are you available for hire?",
    expectIntent: "contact",
  },
  {
    q: "hello",
    expectIntent: "greeting",
  },
  {
    q: "hello, I would like to know about vipul",
    expectIntent: "who",
  },
  {
    q: "where are you from?",
    expectIntent: "origin",
  },
  {
    q: "Do you have rights to work in the EU?",
    expectIntent: "salary",
  },
  {
    q: "list down the projects you have worked on",
    expectIntent: "list_projects",
  },
  {
    q: "Summary of Goplay case study",
    topicCompany: "n26",
    expectIntent: "goplay",
  },
  {
    q: "give me a summary of the case study",
    topicCompany: "n26",
    expectIntentNot: "n26",
    expectNoAppendMatch: true,
  },
  {
    q: "about silent ninja",
    topicCompany: "n26",
    expectIntent: "ninja",
  },
  {
    q: "not just n26 but across",
    expectIntent: "list_projects",
  },
  {
    q: "are you using AI?",
    expectIntent: "using_ai",
  },
  {
    q: "i would like to talk to vipul",
    expectIntent: "contact",
  },
  {
    q: "What is your philosophy on handling design tech debt when building design systems?",
    expectIntent: "design_approach",
  },
  {
    q: "I think you are only telling me about locked case studies",
    expectIntentNot: "n26",
  },
];

let failed = 0;

for (const c of cases) {
  const intent = K.matchIntent(c.q);
  const results = K.searchChunks(c.q, true, null, c.topicCompany || "raisin");

  if (c.expectIntent && (!intent || intent.id !== c.expectIntent)) {
    console.error(`FAIL: "${c.q}" intent expected ${c.expectIntent}, got ${intent?.id}`);
    failed++;
    continue;
  }

  if (c.expectIntentNot && intent && intent.id === c.expectIntentNot) {
    console.error(`FAIL: "${c.q}" should not match intent ${c.expectIntentNot}`);
    failed++;
    continue;
  }

  if (c.expectNoAppendMatch && K.expandQueryWithTopic) {
    const expanded = K.expandQueryWithTopic(c.q, c.topicCompany || "n26");
    const expandedIntent = K.matchIntent(expanded);
    if (expandedIntent && expandedIntent.id === "n26" && !/\bn26\b/i.test(c.q)) {
      console.error(`FAIL: "${c.q}" expanded query poisoned intent to n26 (${JSON.stringify(expanded)})`);
      failed++;
      continue;
    }
  }

  if (c.chunkHasNoHttp) {
    const text = K.CHUNKS[c.chunkHasNoHttp] || "";
    if (/https?:\/\//i.test(text)) {
      console.error(`FAIL: chunk ${c.chunkHasNoHttp} contains a URL`);
      failed++;
      continue;
    }
  }

  if (c.notChunk && intent?.chunkId === c.notChunk) {
    console.error(`FAIL: "${c.q}" should not use chunk ${c.notChunk}`);
    failed++;
    continue;
  }

  if (c.expectFollowUp && !K.isFollowUp(c.q)) {
    console.error(`FAIL: "${c.q}" should be follow-up`);
    failed++;
    continue;
  }

  if (c.searchNotTop && results[0]?.id === c.searchNotTop && !c.expectFollowUp) {
    console.error(`FAIL: "${c.q}" search top should not be ${c.searchNotTop}`);
    failed++;
    continue;
  }

  console.log(`OK: ${c.q}`);
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log(`\nPASS: ${cases.length} knowledge routing checks`);
