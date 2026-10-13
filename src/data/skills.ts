export type SkillCategory =
  | "CORE"
  | "INSIGHTS"
  | "CREATIVE"
  | "STRATEGY"
  | "COMMUNICATION";

export interface Skill {
  id: string;
  number: string;
  title: string;
  description: string;
  category: SkillCategory;
  visualConcept: string;
  /** Orbit radius in scene units (inner = smaller). */
  orbitRadius: number;
  /** Orbital inclination in radians. */
  inclination: number;
  /** Angular speed, radians per second (inner = faster). */
  speed: number;
  /** Planet radius in scene units. */
  size: number;
  /** Planet body colour (locked palette only). */
  color: string;
  /** Optional secondary accent colour for surface detail. */
  accent: string;
  /** Starting phase offset so planets are not aligned at load. */
  phase: number;
}

export const sunSkill = {
  id: "brand-strategy",
  number: "01",
  title: "BRAND STRATEGY",
  description:
    "Positioning brands, defining their identity, and creating meaningful differentiation in competitive markets.",
  category: "CORE" as SkillCategory,
  visualConcept: "Dimensional red sun with animated corona",
  tag: "CORE CAPABILITY",
};

export const skills: Skill[] = [
  {
    id: "consumer-behaviour",
    number: "02",
    title: "CONSUMER BEHAVIOUR",
    description:
      "Understanding purchasing decisions, price perception, motivations, and consumer preferences.",
    category: "INSIGHTS",
    visualConcept:
      "Textured planet; surface pattern of interconnected decision pathways",
    orbitRadius: 3.4,
    inclination: 0.06,
    speed: 0.34,
    size: 0.5,
    color: "#F5F0E8",
    accent: "#151515",
    phase: 0.4,
  },
  {
    id: "creative-strategy",
    number: "03",
    title: "CREATIVE STRATEGY & CAMPAIGN IDEATION",
    description:
      "Turning consumer observations into memorable advertising concepts, creative directions, and brand stories.",
    category: "CREATIVE",
    visualConcept:
      "Faceted sculptural planet, intersecting geometric forms, red and ivory highlights",
    orbitRadius: 4.3,
    inclination: -0.09,
    speed: 0.28,
    size: 0.62,
    color: "#E63843",
    accent: "#F5F0E8",
    phase: 2.1,
  },
  {
    id: "market-research",
    number: "04",
    title: "MARKET RESEARCH",
    description:
      "Exploring markets, gathering consumer feedback, and identifying opportunities for brands.",
    category: "INSIGHTS",
    visualConcept:
      "Fine concentric surface lines, data-like markings, subtle scanning rings",
    orbitRadius: 5.2,
    inclination: 0.12,
    speed: 0.23,
    size: 0.46,
    color: "#D8FF63",
    accent: "#151515",
    phase: 4.4,
  },
  {
    id: "product-marketing",
    number: "05",
    title: "PRODUCT MARKETING",
    description:
      "Connecting product features, customer needs, positioning, and compelling value propositions.",
    category: "STRATEGY",
    visualConcept:
      "Engineered layered sphere with distinct surface panels, precise geometry",
    orbitRadius: 6.1,
    inclination: -0.05,
    speed: 0.19,
    size: 0.7,
    color: "#151515",
    accent: "#F5F0E8",
    phase: 1.2,
  },
  {
    id: "brand-identity",
    number: "06",
    title: "BRAND IDENTITY & PACKAGING",
    description:
      "Developing visual identities and packaging concepts, including the branding and packaging work behind Dip N Sip.",
    category: "CREATIVE",
    visualConcept:
      "Sculptural planet with miniature packaging-inspired geometric forms",
    orbitRadius: 7.0,
    inclination: 0.1,
    speed: 0.16,
    size: 0.58,
    color: "#F5F0E8",
    accent: "#E63843",
    phase: 3.3,
  },
  {
    id: "consumer-insights",
    number: "07",
    title: "CONSUMER INSIGHTS & RESEARCH ANALYSIS",
    description:
      "Translating research observations into useful insights and potential marketing decisions.",
    category: "INSIGHTS",
    visualConcept:
      "Layered translucent-looking globe, intersecting orbital lines, small lit markers",
    orbitRadius: 7.9,
    inclination: -0.13,
    speed: 0.13,
    size: 0.52,
    color: "#D8FF63",
    accent: "#F5F0E8",
    phase: 5.5,
  },
  {
    id: "communication",
    number: "08",
    title: "COMMUNICATION & PERSUASION",
    description:
      "Explaining ideas clearly and communicating effectively with customers and stakeholders.",
    category: "COMMUNICATION",
    visualConcept:
      "Expanding concentric rings, rhythmic sound-wave surface patterns",
    orbitRadius: 8.8,
    inclination: 0.07,
    speed: 0.11,
    size: 0.64,
    color: "#E63843",
    accent: "#D8FF63",
    phase: 0.9,
  },
  {
    id: "business-development",
    number: "09",
    title: "BUSINESS DEVELOPMENT & OPPORTUNITY IDENTIFICATION",
    description:
      "Recognising business problems, understanding customer needs, and exploring opportunities for growth.",
    category: "STRATEGY",
    visualConcept:
      "Faceted planet with interconnected nodes and geometric pathways",
    orbitRadius: 9.7,
    inclination: -0.08,
    speed: 0.09,
    size: 0.75,
    color: "#F5F0E8",
    accent: "#D8FF63",
    phase: 2.8,
  },
];

/** The Sun + eight planets = exactly nine selectable skills. */
export const allSkills = [sunSkill, ...skills];
