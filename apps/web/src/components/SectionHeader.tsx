import { motion } from "framer-motion";

export const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
      {subtitle ? <p className="text-sm opacity-75">{subtitle}</p> : null}
    </motion.div>
  );
};
