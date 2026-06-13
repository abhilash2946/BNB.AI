import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover3d?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover3d = true, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`glass-card ${hover3d ? 'card-3d' : ''} ${className}`}
    onClick={onClick}
    whileHover={hover3d ? { scale: 1.01 } : {}}
  >
    {children}
  </motion.div>
);