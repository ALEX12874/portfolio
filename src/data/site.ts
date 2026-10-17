export interface SectionLink {
  id: string;
  label: string;
}

export const site = {
  ownerName: "Gourang Lokwani",
  firstName: "GOURANG",
  lastName: "LOKWANI",
  roleLine: "Marketing | Consumer Behaviour | Brand Strategy",
  location: "Rajasthan, India",
  email: "gouranglokwani27@gmail.com",
  linkedin: "https://www.linkedin.com/in/gourang-lokwani-438394297/",
  /**
   * Contact form endpoint (FormSubmit, no API key). After activating the
   * form, the address can be swapped for FormSubmit's random-string alias:
   * https://formsubmit.co/ajax/<alias>
   */
  contactEndpoint: "https://formsubmit.co/ajax/gouranglokwani27@gmail.com",
  /** Empty by default — the GitHub button auto-hides when this is "". */
  github: "",
  copyright: "© 2026 Gourang Lokwani",
  eyebrow: "INDEPENDENT MARKETING MIND",
  tagline: "SEE THE WORLD. FIND THE STORY.",
  introLead:
    "Marketing enthusiast fascinated by consumer psychology, brand strategy, and creative storytelling.",
  introLeadHighlights: ["consumer psychology", "brand strategy", "creative storytelling"],
  introBold:
    "Building brands, exploring consumer insights, and turning everyday observations into meaningful marketing ideas.",
  introLight:
    "Blending creativity with strategic thinking to make brands stand out and connect with people.",
} as const;

export const sections: SectionLink[] = [
  { id: "home", label: "Home" },
  { id: "capabilities", label: "Capabilities" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "real-me", label: "The Real Me" },
  { id: "perspectives", label: "Perspectives" },
  { id: "contact", label: "Contact" },
];

export const sectionHeadings = {
  capabilities: {
    eyebrow: "02 / CAPABILITIES",
    title: "EVERYTHING ORBITS A STRATEGY.",
    copy: "Different skills. Different perspectives. One strategic centre. Explore the disciplines that shape how I think, understand people, and build brands.",
    hint: "DRAG TO EXPLORE · TOUCH A PLANET TO DISCOVER",
  },
  projects: {
    eyebrow: "03 / PROJECTS",
    title: "ONE PORTFOLIO. FOUR WORLDS.",
    copy: "Four brands, four strategies — select one to step inside.",
  },
  experience: {
    eyebrow: "04 / EXPERIENCE",
    title: "WHERE IDEAS MET THE REAL WORLD.",
    copy: "From learning how marketing works inside a business to understanding how brands connect with people, every experience has added another layer to the way I think.",
  },
  realMe: {
    eyebrow: "05 / THE REAL ME",
    title: "RAISED BY A FAMILY BUSINESS. TRAINED BY A JOINT FAMILY.",
    /** Display line breaks for the line-by-line reveal (joined = title). */
    titleLines: ["RAISED BY A", "FAMILY BUSINESS.", "TRAINED BY A", "JOINT FAMILY."],
    copy: "Before the projects and internships, there was the family business, and I'm the only son in a joint family. Translation: when something needs sorting, every eye in the house turns to me. That's where I learned how business really works: reading customers, untangling problems, and making calls that actually count.",
  },
  perspectives: {
    eyebrow: "06 / PEOPLE & PERSPECTIVES",
    title: "GOOD WORK LEAVES A GOOD IMPRESSION.",
    copy: "Some of the best things I've learned about marketing came from building ideas with other people. Here's what a few of those collaborations looked like from their side.",
  },
} as const;
