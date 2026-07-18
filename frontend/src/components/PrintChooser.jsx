import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { Printer, X } from "lucide-react";
import { printNode } from "../hooks/usePrint.jsx";

/**
 * Global print-language chooser.
 *
 * Usage from any page:
 *   const openPrint = usePrintDialog();
 *   openPrint((lang) => <SaleInvoice sale={s} showroom={settings} lang={lang} />);
 *
 * A small modal asks the user for Français / العربية, then renders the document
 * in that language and triggers the browser print dialog. Mount <PrintChooser/>
 * once (in AppShell) for it to work.
 */
const usePrintStore = create((set) => ({
  render: null, // (lang) => ReactNode
  open: (render) => set({ render }),
  close: () => set({ render: null }),
}));

export function usePrintDialog() {
  return usePrintStore((s) => s.open);
}

// Convenience: print directly in a known language (used by the post-create prompt).
export function printInLang(render, lang) {
  const node = render(lang);
  if (node) printNode(node);
}

export function PrintChooser() {
  const render = usePrintStore((s) => s.render);
  const close = usePrintStore((s) => s.close);

  const choose = (lang) => {
    const node = render?.(lang);
    close();
    if (node) printNode(node);
  };

  return (
    <AnimatePresence>
      {render && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-steel-950/82 backdrop-blur-sm p-4 no-print"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={close}
        >
          <motion.div
            className="glass-panel w-full max-w-sm p-6"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="heading text-base text-text-primary flex items-center gap-2">
                <Printer size={18} className="text-crimson-300" /> Langue d'impression
              </h3>
              <button onClick={close} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <p className="text-xs text-text-muted mb-5">Choisissez la langue du document · اختر لغة المستند</p>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => choose("fr")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center justify-center gap-1 rounded-xl py-5 border border-crimson-500/42 bg-silver-500/10 hover:bg-crimson-500/20 transition"
              >
                <span className="text-2xl">🇫🇷</span>
                <span className="text-sm font-bold text-text-primary">Français</span>
              </motion.button>
              <motion.button
                onClick={() => choose("ar")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center justify-center gap-1 rounded-xl py-5 border border-crimson-500/42 bg-silver-500/10 hover:bg-crimson-500/20 transition"
              >
                <span className="text-2xl">🇩🇿</span>
                <span className="text-sm font-bold text-text-primary">العربية</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
