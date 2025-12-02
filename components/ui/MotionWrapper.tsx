"use client";
import { motion } from "framer-motion";

export const MotionDiv = motion.div;

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1 // Her eleman 0.1sn gecikmeli gelsin
    }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 }, // Aşağıdan yukarı
  show: { opacity: 1, y: 0 }
};