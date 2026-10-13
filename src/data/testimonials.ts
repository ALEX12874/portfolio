export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  /** Small editorial context label, or null when the card is unlabelled. */
  context: string | null;
  linkedin: string;
  /** Subtle per-card hover/editorial character. */
  tone: "neutral" | "playful" | "calm" | "dots" | "red" | "structured";
}

/** Verbatim quotes. Each name maps to its own LinkedIn URL. */
export const testimonials: Testimonial[] = [
  {
    id: "vartika-yadav",
    name: "Vartika Yadav",
    quote:
      "Gourang has a knack for looking at ordinary things from a marketing perspective. His curiosity and fresh ideas make brainstorming with him genuinely interesting.",
    context: null,
    linkedin: "https://www.linkedin.com/in/vartika-yadav-b39a23314/",
    tone: "neutral",
  },
  {
    id: "prachi-maheshwari",
    name: "Prachi Maheshwari",
    quote:
      "Working with Gourang on Inayat was fun. He always had new ideas, sometimes more than we could fit into the project, but his enthusiasm definitely kept things moving.",
    context: "INAYAT PROJECT",
    linkedin: "https://www.linkedin.com/in/prachi-maheshwari-ab51a3321/",
    tone: "playful",
  },
  {
    id: "diya-doshi",
    name: "Diya Doshi",
    quote:
      "Working alongside Gourang taught me how much a different perspective can add to a project. He was approachable, expressive, and genuinely interested in making things better.",
    context: null,
    linkedin: "https://www.linkedin.com/in/diya-doshi-388625265/",
    tone: "calm",
  },
  {
    id: "mohak-upadhyay",
    name: "Mohak Upadhyay",
    quote:
      "Working with Gourang meant starting with one idea and somehow ending up discussing three business opportunities! Jokes aside, his curiosity and energy made working together memorable.",
    context: null,
    linkedin: "https://www.linkedin.com/in/mohak-upadhyay-99360531b/",
    tone: "dots",
  },
  {
    id: "dhruv-gyayak",
    name: "Dhruv Gyayak",
    quote:
      "We fought over ideas, found solutions, and kept building. We didn't always agree, but we always moved forward.",
    context: "DIP N SIP",
    linkedin: "https://www.linkedin.com/in/dhruv-gyayak/",
    tone: "red",
  },
  {
    id: "aarnav-agrawal",
    name: "Aarnav Agrawal",
    quote:
      "Working with Gourang on product marketing was eye-opening. He looked beyond the product itself, focusing on positioning, packaging, and what would actually make customers connect with the brand.",
    context: "PRODUCT MARKETING",
    linkedin: "https://www.linkedin.com/in/aarnav-agrawal-2ba7a02b6/",
    tone: "structured",
  },
];
