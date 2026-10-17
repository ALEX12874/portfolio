/**
 * 05 / THE REAL ME — the spider-web scene.
 * Components only read from here (and sectionHeadings.realMe in site.ts).
 */
export interface WebSkill {
  id: string;
  number: string;
  title: string;
  line: string;
}

export const realMe = {
  skills: [
    { id: "market-analysis", number: "01", title: "Market Analysis", line: "Reading the market before it reads me." },
    {
      id: "consumer-psychology",
      number: "02",
      title: "Consumer Psychology",
      line: "Decoding 'just looking' and what makes people come back.",
    },
    { id: "problem-solving", number: "03", title: "Problem Solving", line: "Problems land in my web. They don't leave unsolved." },
    { id: "decision-making", number: "04", title: "Decision Making", line: "Making the call and owning it. No committee required." },
    {
      id: "creative-mindset",
      number: "05",
      title: "Creative Mindset",
      line: "When Plan A fails, the alphabet has 25 more letters.",
    },
  ] as WebSkill[],
  /**
   * Mindset paragraph, split around the two marked phrases:
   * I never asked "Why only me?" I asked "What's next?" Responsibility …
   */
  mindset: {
    before: "I never asked ",
    struck: '"Why only me?"',
    middle: " I asked ",
    highlighted: '"What\'s next?"',
    after:
      " Responsibility is my favourite teacher, busy is my default setting, and excuses never made it onto my to-do list. Fun fact: some of the work I took on for free ended with people insisting on paying me. Turns out, showing up is a business model.",
  },
  signature: { lead: "NO EXCUSES. JUST WORK ", accent: "DONE." },
  counterLabel: "PROBLEMS SORTED TODAY:",
  hint: {
    pointer: "Throw me a problem — click the web.",
    touch: "Tap the web to throw me a problem.",
  },
  /** Playful labels carried by the bugs (illustrations, not claims). */
  bugLabels: [
    "Last-minute order",
    "Price war next door",
    '"Just looking" customer',
    "Stock ran out",
    "Family function + delivery, same day",
    "Supplier on holiday",
    "Deadline: yesterday",
    '"Beta, one small work…"',
  ],
} as const;
