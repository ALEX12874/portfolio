import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ProjectTheme } from "../../data/projects";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ProjectTransitionProps {
  /** Drives the transition — works from ANY project to ANY other. */
  theme: ProjectTheme;
  /** Identity of the current project (used as the AnimatePresence key). */
  projectId: string;
  children: ReactNode;
}

/**
 * Reusable, token-driven transition system: a motif-coloured panel wipes
 * across the stage in one direction and out the other while the content
 * cross-fades. Consistent motion language (≈ 900ms) for every pair.
 */
export default function ProjectTransition({
  theme,
  projectId,
  children,
}: ProjectTransitionProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* cross-fading atmosphere + motif */}
      <AnimatePresence mode="wait">
        <motion.div
          key={projectId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* token-driven wipe panel */}
      <AnimatePresence>
        <motion.div
          key={`${projectId}-wipe`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ backgroundColor: theme.bg }}
          initial={{ scaleX: 0, transformOrigin: "0% 50%" }}
          animate={{
            scaleX: [0, 1, 1, 0],
            transformOrigin: ["0% 50%", "0% 50%", "100% 50%", "100% 50%"],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE, times: [0, 0.42, 0.5, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}
