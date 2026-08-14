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
    q: "more",
    expectFollowUp: true,
    searchNotTop: "olx",
  },
  {
    q: "what was the impact you generated at Raisin?",
    expectIntent: "work_impact",
  },
];

let failed = 0;

for (const c of cases) {
  const intent = K.matchIntent(c.q);
  const results = K.searchChunks(c.q, true, null, "raisin");

  if (c.expectIntent && (!intent || intent.id !== c.expectIntent)) {
    console.error(`FAIL: "${c.q}" intent expected ${c.expectIntent}, got ${intent?.id}`);
    failed++;
    continue;
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
