import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

// Autocomplete that calls `fetcher(query)` (async -> array) and renders results
export default function SearchSelect({ fetcher, placeholder = "Rechercher...", renderItem, onSelect, mapResults }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (query.trim().length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await fetcher(query);
        setResults(mapResults ? mapResults(data) : data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, fetcher, mapResults]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          className="input pl-9 rtl:pl-3 rtl:pr-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      <AnimatePresence>
        {open && (results.length > 0 || loading) && (
          <motion.div
            className="absolute z-30 mt-1 w-full glass-panel max-h-64 overflow-y-auto p-1 origin-top"
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {loading && <div className="p-3 text-sm text-text-muted">Recherche...</div>}
            {results.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  onSelect(item);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full text-left rtl:text-right p-2.5 rounded-lg hover:bg-red-600/10 transition"
              >
                {renderItem(item)}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
