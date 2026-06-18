'use client';

import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  className?: string;
}

export function AnimatedCounter({ value, duration = 0.8, formatter, className }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    formatter ? formatter(Math.round(v)) : Math.round(v).toLocaleString(),
  );

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
