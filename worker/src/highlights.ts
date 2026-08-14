export type HighlightTag =
  | "wants_password"
  | "recruiting"
  | "freelance"
  | "mentoring"
  | "contact_info"
  | "unlocked"
  | "berlin_relocation";

interface Rule {
  tag: HighlightTag;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    tag: "wants_password",
    patterns: [
      /\bpassword\b/i,
      /\b(case study|case studies)\b/i,
      /\blocked\b/i,
      /\brecent (work|projects?)\b/i,
      /\b(access|unlock)\b/i,
      /\braisin\b/i,
      /\bolx\b/i,
      /\bn26\b/i,
      /\bgomart\b/i,
    ],
  },
  {
    tag: "recruiting",
    patterns: [
      /\b(hiring|recruit|recruiter|interview|full[- ]?time|job|position|role opening)\b/i,
      /\bsenior (designer|product)\b/i,
    ],
  },
  {
    tag: "freelance",
    patterns: [
      /\b(freelance|contract|consulting|advisory|founder|startup project)\b/i,
    ],
  },
  {
    tag: "mentoring",
    patterns: [
      /\b(mentor|mentorship|adplist|portfolio review|career advice)\b/i,
    ],
  },
  {
    tag: "berlin_relocation",
    patterns: [
      /\b(berlin|relocate|relocation|visa|work authorization|remote)\b/i,
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function detectHighlights(
  content: string,
  role: string,
  extraTags: HighlightTag[] = []
): HighlightTag[] {
  const tags = new Set<HighlightTag>(extraTags);

  if (role === "user") {
    for (const rule of RULES) {
      if (rule.patterns.some((p) => p.test(content))) {
        tags.add(rule.tag);
      }
    }
    if (EMAIL_RE.test(content.trim())) {
      tags.add("contact_info");
    }
  }

  if (role === "system" && extraTags.includes("unlocked")) {
    tags.add("unlocked");
  }

  return Array.from(tags);
}

export function mergeHighlights(
  existing: HighlightTag[],
  incoming: HighlightTag[]
): HighlightTag[] {
  return Array.from(new Set([...existing, ...incoming]));
}

export const HIGHLIGHT_LABELS: Record<HighlightTag, string> = {
  wants_password: "Wants access",
  recruiting: "Recruiting",
  freelance: "Freelance",
  mentoring: "Mentoring",
  contact_info: "Left email",
  unlocked: "Unlocked",
  berlin_relocation: "Berlin / relocation",
};

export const FILTER_TAGS: Record<string, HighlightTag> = {
  wants_access: "wants_password",
  recruiting: "recruiting",
  mentoring: "mentoring",
  unlocked: "unlocked",
};
