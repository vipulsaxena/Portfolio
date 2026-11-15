/**
 * Market overlays — English source strings that read differently in a market, applied
 * before any language dictionary. `all` runs for every UI language, `en` only for English.
 */

const EU_PROTECTION = "Protection limit: up to €100,000 per bank · DGS insured";

export const MARKET_OVERLAYS = {
  gb: {
    /* UK deposits are FSCS-protected up to £120,000 per person, per bank (since 1 Dec 2025). */
    all: {
      exact: { [EU_PROTECTION]: "Protection limit: up to £120,000 per bank · FSCS protected" },
    },
    /* Raisin UK glossary: easy access, fix rate bonds, savings accounts (not deposits). */
    en: {
      exact: {
        /* Easy access (overnight) */
        "Overnight deposits": "Easy access accounts",
        "Overnight deposit": "Easy access account",
        "Overnight Deposit": "Easy access account",
        "Overnight Money": "Easy Access",
        Overnight: "Easy access",
        "Overnight deposits · awaiting transfer": "Easy access accounts · awaiting transfer",
        "Current rate: 3.20 % p. a. · Overnight deposits": "Current rate: 3.20 % p. a. · Easy access accounts",
        "Earn more with competitive overnight rates": "Earn more with competitive easy access rates",
        "Earn more with overnight deposits": "Earn more with easy access accounts",
        "No overnight deposits yet.": "No easy access accounts yet.",
        /* Fix rate bonds (fixed term) */
        "Fixed term deposits": "Fix rate bonds",
        "Fixed term deposit": "Fix rate bond",
        "Fixed-term deposits": "Fix rate bonds",
        "Fixed-term deposit": "Fix rate bond",
        "Fix term deposits": "Fix rate bonds",
        "Fix Term Deposit": "Fix rate bond",
        "Fixed-term deposits · awaiting transfer": "Fix rate bonds · awaiting transfer",
        "Fixed term": "Fix rate bond",
        "Fixed-term": "Fix rate bond",
        "Fix term": "Fix rate bond",
        "Fixed-term deposit · 5 years · Latvia (A−)": "Fix rate bond · 5 years · Latvia (A−)",
        "Fixed-term deposit · 4 years · Latvia (A−)": "Fix rate bond · 4 years · Latvia (A−)",
        "Fixed-term deposit · 3 years · Italy (BBB)": "Fix rate bond · 3 years · Italy (BBB)",
        "Fixed-term deposit · 2 years · Sweden (AAA)": "Fix rate bond · 2 years · Sweden (AAA)",
        "Fixed-term deposit · 1 year · Italy (BBB)": "Fix rate bond · 1 year · Italy (BBB)",
        "5 years · Fixed term": "5 years · Fix rate bond",
        "4 years · Fixed term": "4 years · Fix rate bond",
        "3 years · Fixed term": "3 years · Fix rate bond",
        "2 years · Fixed term": "2 years · Fix rate bond",
        "1 year · Fixed term": "1 year · Fix rate bond",
        "6 months · Fixed term": "6 months · Fix rate bond",
        "Boost your savings with a new fixed-term deposit": "Boost your savings with a new fix rate bond",
        /* Savings accounts (consumer-facing “deposit” wording) */
        "Popular deposits": "Popular savings accounts",
        "Popular Deposits": "Popular savings accounts",
        "Popular deposits for you": "Popular savings accounts for you",
        "Group deposits by": "Group savings accounts by",
        "All deposits": "All savings accounts",
        "Show all deposits": "Show all savings accounts",
        "All active deposits": "All active savings accounts",
        "No savings deposits yet.": "No savings accounts yet.",
        "7 Deposits": "7 savings accounts",
        "Matured deposits": "Matured savings accounts",
        "Deposit type": "Savings account type",
        "1 pending deposit": "1 pending savings account",
        "2 pending deposits": "2 pending savings accounts",
        "3 pending deposits": "3 pending savings accounts",
        "No Risk Deposit": "No risk savings account",
        "Saving products": "Savings products",
        /* Raisin UK Account naming */
        "Raisin Account": "Raisin UK Account",
        "Low Raisin Account balance": "Low Raisin UK Account balance",
        "Across raisin account": "Across Raisin UK Account",
        "Your KYC has expired. Re-authenticate within 3 months to keep your Raisin account active.":
          "Your KYC has expired. Re-authenticate within 3 months to keep your Raisin UK Account active.",
        "We can only process your order once you have enough funds on your Raisin account.":
          "We can only process your order once you have enough funds on your Raisin UK Account.",
        "We can only process your order once we have enough funds on your Raisin account.":
          "We can only process your order once we have enough funds on your Raisin UK Account.",
        "Show all their Products ›": "Show all their products ›",
        /* Notice account — sentence case per UK glossary */
        "Notice Account": "Notice account",
      },
      templates: {
        "Please transfer {0} to your Raisin account": "Please transfer {0} to your Raisin UK Account",
        "{0} · Raisin Account": "{0} · Raisin UK Account",
        "{0} in fixed-term and overnight orders are processing.": "{0} in fix rate bond and easy access orders are processing.",
        "Rietumu Banka · 5 years · Latvia (A−). Above your current {0} fixed-term rate.":
          "Rietumu Banka · 5 years · Latvia (A−). Above your current {0} fix rate bond rate.",
      },
    },
  },
  ie: {},
  pl: {},
};

/**
 * Hard-coded marketing figures in English copy — re-formatted (rate label, currency) for
 * English outside Germany. Each `{0}` is a figure such as "3.50% p.a." or "€1".
 */
export const EN_TEMPLATES = {
  "Secure returns of up to {0} – no risks or fluctuations for your short-term goals.":
    "Secure returns of up to {0} – no risks or fluctuations for your short-term goals.",
  "Earn up to {0} on savings from {1}, with no fees and a flexible plan.":
    "Earn up to {0} on savings from {1}, with no fees and a flexible plan.",
  "Secure returns of up to {0} with no risks": "Secure returns of up to {0} with no risks",
};
