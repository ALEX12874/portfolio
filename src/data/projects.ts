import { assets } from "./assets";

export type ProjectId = "dipnsip" | "wrepd" | "synkk" | "inayat";

export interface ProjectTheme {
  /** Section-scoped background colour. */
  bg: string;
  /** Section-scoped foreground (type) colour. */
  fg: string;
  /** Section-scoped accent colour. */
  accent: string;
  motif: "leaves" | "route" | "grid" | "botanical";
}

export type Cta =
  | { kind: "external"; label: string; href: string }
  | { kind: "case-study"; label: string };

export interface Project {
  id: ProjectId;
  number: string;
  name: string;
  category: string;
  description: string;
  /** "My contribution" — only for projects where résumé text exists. */
  contribution: string | null;
  contributionNote: string | null;
  logo: string;
  /**
   * "plate"  = logo has its own solid background, keep it inside a contained plate.
   * "white"  = white artwork, sits on a clean white plate.
   */
  logoPresentation: "plate" | "white";
  logoAlt: string;
  theme: ProjectTheme;
  cta: Cta;
  /** Extra copy used only by the Wrepd case-study drawer. */
  caseStudyPillars?: string[];
  caseStudySummary?: string;
}

export const projects: Project[] = [
  {
    id: "dipnsip",
    number: "01",
    name: "DIP N SIP",
    category: "Brand Strategy / Brand Identity / Packaging",
    description:
      "Dip N Sip is a contemporary tea premix brand that reimagines India's timeless love for chai through premium quality, authentic flavours, and effortless convenience. Inspired by Assam's rich tea heritage, its single-serve premixes in Masala, Adrak, and Elaichi bring the comfort of a perfect cup of chai to modern lifestyles. From crafting a distinctive brand identity to developing thoughtfully designed packaging, every element reflects the vision of blending tradition with innovation. More than just tea, Dip N Sip is about making everyday moments warmer, simpler, and worth savouring — one sip at a time.",
    contribution:
      "Built the tea premix brand concept from ideation to market positioning — identifying consumer needs, analysing competitors, and developing a unique brand proposition. Designed branding and packaging concepts and marketing strategies.",
    contributionNote: "Self-funded brand development project, Apr 2025 – Dec 2025.",
    logo: assets.logoDipNSip,
    logoPresentation: "plate",
    logoAlt: "Dip N Sip logo — cream sun-burst S mark on a deep forest-green square",
    theme: { bg: "#14342B", fg: "#F3EAD8", accent: "#E63843", motif: "leaves" },
    cta: {
      kind: "external",
      label: "Explore Dip N Sip",
      href: "https://www.instagram.com/thedipnsip/",
    },
  },
  {
    id: "wrepd",
    number: "02",
    name: "WREPD",
    category: "Business Concept / Brand Strategy / OOH Advertising",
    description:
      "Wrepd is a vehicle-based Out-of-Home advertising startup that transforms commercial fleets into moving brand assets. By partnering with fleet operators and leveraging GPS-enabled tracking and strategic route planning, Wrepd aims to help brands turn everyday logistics vehicles into high-visibility advertising platforms. Its end-to-end model connects advertisers with fleet owners while managing campaign planning, creative execution, professional vehicle wraps, and performance reporting. The concept offers brands a scalable way to extend their reach across cities while creating an additional revenue stream for fleet operators. With the vision of building organised, measurable, and route-driven mobile media networks, Wrepd reimagines traditional outdoor advertising by taking brand visibility beyond fixed billboards and onto the roads where everyday journeys happen.",
    contribution: null,
    contributionNote: null,
    logo: assets.logoWrepd,
    logoPresentation: "white",
    logoAlt: "Wrepd logo — red delivery truck with the words WREPD and Advertising That Moves",
    theme: { bg: "#E63843", fg: "#FFFFFF", accent: "#151515", motif: "route" },
    cta: { kind: "case-study", label: "Explore Wrepd" },
    caseStudySummary:
      "Wrepd turns everyday delivery fleets into measurable, route-driven media networks — brand visibility that leaves the fixed billboard and joins the traffic.",
    caseStudyPillars: [
      "Fleet partnerships",
      "GPS tracking & route planning",
      "Vehicle wraps",
      "Performance reporting",
    ],
  },
  {
    id: "synkk",
    number: "03",
    name: "SYNKK",
    category: "Product Concept / Digital Solutions / Hospitality Technology",
    description:
      "Synkk is a digital solutions platform that helps cafés, restaurants, and growing hospitality businesses streamline their operations through customised technology. From QR-based ordering and live kitchen dashboards to billing systems, bookings, and workflow automation, Synkk simplifies everyday processes, reduces operational friction, and enables smoother coordination between customers and staff. Its approach focuses on building practical, business-specific software rather than relying on rigid, one-size-fits-all solutions. By bringing essential operations into a more connected digital ecosystem, Synkk empowers café owners and restaurant chains to manage their businesses more efficiently, enhance the customer experience, and focus on what matters most — delivering great food and hospitality.",
    contribution: null,
    contributionNote: null,
    logo: assets.logoSynkk,
    logoPresentation: "plate",
    logoAlt: "Synkk logo — vivid lime wordmark on a pure black square",
    theme: { bg: "#0A0A0A", fg: "#F5F0E8", accent: "#D8FF63", motif: "grid" },
    cta: {
      kind: "external",
      label: "Explore Synkk",
      href: "https://www.instagram.com/synkk.in/",
    },
  },
  {
    id: "inayat",
    number: "04",
    name: "INAYAT",
    category: "Brand Development / Consumer Behaviour / Personalisation",
    description:
      "Inayat was a college group project focused on developing an original perfume brand with a consumer-centric approach to fragrance discovery. Its key USP was a personalised perfume recommendation experience, where users could fill out a questionnaire on the website and receive fragrance suggestions based on their preferences and individual tastes. The project involved exploring brand positioning, developing the business concept, and creating a digital presence to make fragrance selection more engaging and intuitive. Alongside the brand concept, the team developed a website to demonstrate how personalisation could enhance the customer journey in the perfume industry. Inayat combined branding, consumer behaviour, and digital marketing to explore how a traditional fragrance-buying experience could become more tailored, interactive, and customer-focused.",
    contribution:
      "Co-developed the perfume brand concept and business pitch, including branding, website design and customer experience strategy; created a personalised fragrance recommendation system based on an online questionnaire.",
    contributionNote: "Team project, March 2025.",
    logo: assets.logoInayat,
    logoPresentation: "plate",
    logoAlt: "Inayat logo — ivory botanical sprig with INAYAT and Where Elegance Meets Essence on charcoal",
    theme: { bg: "#EDE5D8", fg: "#151515", accent: "#6E6358", motif: "botanical" },
    cta: {
      kind: "external",
      label: "Explore Inayat",
      href: "https://veds0710.wixsite.com/deniz",
    },
  },
];

export const defaultProjectId: ProjectId = "dipnsip";
