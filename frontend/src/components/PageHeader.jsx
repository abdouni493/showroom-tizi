import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, action, actionLabel, icon: Icon = Plus, children }) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            className="heading text-2xl sm:text-3xl text-text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            {title}
          </motion.h1>
          {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {children}
          {action && (
            <motion.button
              className="btn-primary"
              onClick={action}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon size={16} /> {actionLabel}
            </motion.button>
          )}
        </div>
      </div>
      <motion.div
        className="h-0.5 mt-3 origin-left"
        style={{ background: "linear-gradient(90deg,#dc2626,transparent)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}
