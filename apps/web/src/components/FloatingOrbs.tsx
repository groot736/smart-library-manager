import { motion } from "framer-motion";

const orbs = [
  { size: 220, x: "8%", y: "12%", color: "rgba(56,189,248,0.28)", delay: 0 },
  { size: 280, x: "70%", y: "20%", color: "rgba(251,146,60,0.2)", delay: 0.4 },
  { size: 170, x: "35%", y: "70%", color: "rgba(52,211,153,0.18)", delay: 0.8 },
  { size: 130, x: "85%", y: "75%", color: "rgba(244,114,182,0.15)", delay: 1.1 },
];

export const FloatingOrbs = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {orbs.map((orb) => (
        <motion.div
          key={`${orb.x}-${orb.y}`}
          className="absolute rounded-full blur-3xl"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: orb.color,
          }}
          animate={{
            y: [0, -14, 10, 0],
            x: [0, 10, -8, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: orb.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};
