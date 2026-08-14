import { motion } from "framer-motion";
import type { ReactNode } from "react";
import Card from "./ui/Card";
import { TRANSITIONS, useMotionTransition } from "../lib/motion-config";

/**
 * Both shadow values carry the same two layers so Framer interpolates them
 * cleanly instead of snapping between mismatched shadow structures.
 */
const SHADOW_REST = "0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(59,130,246,0)";
const SHADOW_HOVER = "0 10px 30px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.15)";

interface AnimatedCardProps {
  children: ReactNode;
  /** Classes for the inner Card (padding, layout, overrides). */
  className?: string;
  onClick?: () => void;
}

/**
 * Motion wrapper around the existing Card.
 *
 * Card is rendered with interactive={false} on purpose: its interactive preset
 * applies its own CSS translate/scale on hover, which would stack on top of the
 * motion transforms here and animate on a CSS transition instead of the spring.
 * The border-colour hover has to stay on Card itself (it owns the border), so it
 * is passed through className.
 */
export default function AnimatedCard({ children, className = "", onClick }: AnimatedCardProps) {
  const transition = useMotionTransition(TRANSITIONS.spring);

  return (
    <motion.div
      className="rounded-card"
      style={{ boxShadow: SHADOW_REST }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: SHADOW_HOVER }}
      whileTap={{ scale: 0.98 }}
      transition={transition}
    >
      <Card
        interactive={false}
        onClick={onClick}
        className={`cursor-pointer hover:border-primary/40 ${className}`}
      >
        {children}
      </Card>
    </motion.div>
  );
}
