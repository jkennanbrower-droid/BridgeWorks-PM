import { motion } from "framer-motion";

export function HealthSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
      className="space-y-4"
    >
      <div className="h-32 rounded-2xl border border-slate-200 bg-white" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="h-48 rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </motion.div>
  );
}
