'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className }: StaggerProps) {
  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
