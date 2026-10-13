import { Download, ExternalLink } from "lucide-react";

interface DocumentActionsProps {
  src: string;
  /** Filename used by the download attribute. */
  filename: string;
  /** Accessible noun, e.g. "Gyayak completion letter". */
  name: string;
}

/**
 * "Open document" (new tab) and "Download" (download attribute) actions,
 * always available alongside any preview.
 */
export default function DocumentActions({ src, filename, name }: DocumentActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,240,232,0.3)] px-4 py-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#F5F0E8] transition-colors duration-300 hover:border-[#D8FF63] hover:text-[#D8FF63]"
        aria-label={`Open ${name} in a new tab`}
      >
        <ExternalLink size={15} aria-hidden="true" />
        Open document
      </a>

      <a
        href={src}
        download={filename}
        className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,240,232,0.3)] px-4 py-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#F5F0E8] transition-colors duration-300 hover:border-[#E63843] hover:bg-[#E63843] hover:text-[#F5F0E8]"
        aria-label={`Download ${name}`}
      >
        <Download size={15} aria-hidden="true" />
        Download
      </a>
    </div>
  );
}
