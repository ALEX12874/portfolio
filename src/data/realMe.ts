/**
 * 05 / THE REAL ME — copy for the "family ledger" section.
 * Components only read from here (and sectionHeadings.realMe in site.ts).
 */
export interface HeritageSkill {
  id: string;
  number: string;
  title: string;
  line: string;
}

export const realMe = {
  skillsHeading: "WHAT I BRING FROM MY HERITAGE",
  skillsLine: "Alongside my marketing skills, these come with me from home.",
  /** Embossed label on the ledger cover. */
  ledgerLabel: "GOURANG — LEDGER",
  skills: [
    {
      id: "market-analysis",
      number: "01",
      title: "Market Analysis",
      line: "Reading what the market wants and how it shifts, through everyday business.",
    },
    {
      id: "consumer-psychology",
      number: "02",
      title: "Consumer Psychology",
      line: "Understanding customer preferences: what makes people choose, return and trust.",
    },
    {
      id: "problem-solving",
      number: "03",
      title: "Problem Solving",
      line: "Fixing real business problems as they come, with whatever is at hand.",
    },
    {
      id: "decision-making",
      number: "04",
      title: "Decision Making",
      line: "Taking calls that have real consequences, and owning them.",
    },
    {
      id: "creative-mindset",
      number: "05",
      title: "Creative Mindset",
      line: "Finding another way when the usual one doesn't work.",
    },
  ] as HeritageSkill[],
  mindset: {
    eyebrow: "BEYOND THE CV",
    /** The question I never ask — set in display type with a strike line. */
    question: '"Why only me?"',
    before: "Being the one everyone counts on never made me ask, ",
    after:
      " I take every responsibility as a chance to learn. I like being busy and getting the work done without excuses, and more than once, work I took on without expecting anything in return ended with people choosing to pay me for it.",
  },
  quote: "NO EXCUSES. JUST WORK DONE.",
} as const;
