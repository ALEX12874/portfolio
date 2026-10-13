interface LinkedInProfileLinkProps {
  name: string;
  href: string;
}

/** Official-style LinkedIn "in" mark (inline SVG). */
function InMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

/**
 * Small LinkedIn icon in a ≥ 40×40 hit area, sitting at the bottom-right of a
 * testimonial card. The card itself is not a link.
 */
export default function LinkedInProfileLink({ name, href }: LinkedInProfileLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${name} on LinkedIn (opens in a new tab)`}
      className="group pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-[rgba(21,21,21,0.6)] transition-all duration-400 ease-editorial hover:-translate-y-0.5 hover:bg-[#151515] hover:text-[#D8FF63]"
    >
      <InMark />
    </a>
  );
}
