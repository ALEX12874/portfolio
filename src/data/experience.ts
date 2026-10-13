import { assets } from "./assets";

export type Certificate =
  | { kind: "image"; src: string; alt: string }
  | { kind: "pdf"; src: string; alt: string }
  | null;

export interface Experience {
  id: string;
  number: string;
  company: string;
  role: string;
  domain: string;
  duration: string;
  description: string;
  certificate: Certificate;
}

export const experiences: Experience[] = [
  {
    id: "hlbs",
    number: "01",
    company: "HLBS Tech Pvt. Ltd.",
    role: "Marketing & Sales Intern",
    domain: "Marketing & Sales",
    duration: "5 January 2026 – 5 March 2026",
    description:
      "Completed an internship at HLBS Tech Pvt. Ltd., gaining practical exposure to marketing and sales operations. Participated in marketing and sales-related activities while developing an understanding of customer engagement, business communication, market research, and sales processes. The experience strengthened my professional communication, teamwork, and understanding of how marketing and sales contribute to business development. Throughout the internship, I demonstrated dedication, sincerity, and professional conduct while applying my academic knowledge to a practical business environment.",
    // The HLBS certificate image was not supplied with this build — see assets.ts.
    certificate: assets.certHlbs
      ? {
          kind: "image",
          src: assets.certHlbs,
          alt: "HLBS Tech Pvt. Ltd. marketing and sales internship certificate",
        }
      : null,
  },
  {
    id: "gyayak",
    number: "02",
    company: "Gyayak Marketing Pvt. Ltd.",
    role: "Marketing Intern",
    domain: "Digital Marketing, Social Media & Brand Promotion",
    duration: "September 2024 – March 2025",
    description:
      "Worked as a Marketing Intern at Gyayak Marketing Pvt. Ltd., gaining hands-on experience in digital marketing, brand development, and market research. My responsibilities included managing social media activities, supporting content planning and execution, conducting market research and competitor analysis, and identifying customer preferences and emerging market trends. I also contributed to digital marketing and brand promotion initiatives, developing a practical understanding of how businesses build brand awareness, engage target audiences, and strengthen their market positioning. This experience enhanced my analytical thinking, creative problem-solving, communication, and teamwork skills while allowing me to apply academic marketing concepts to real-world business activities.",
    certificate: {
      kind: "pdf",
      src: assets.certGyayak,
      alt: "Gyayak Marketing letter of internship completion dated 20 June 2026",
    },
  },
];
