import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";

const MENU_W = 184;

// items: [{ label, icon, onClick, danger }]
// Renders the dropdown in a portal with viewport clamping so it never opens
// off-screen (e.g. cut off on the right) and is never clipped by a card.
export default function ActionMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const btnRef = useRef();
  const menuRef = useRef();
  const list = items.filter(Boolean);

  const computePlacement = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estH = list.length * 40 + 12;

    // horizontal: align the menu's right edge to the button (opens to the LEFT),
    // then clamp inside the viewport.
    let left = r.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > vw - 8) left = vw - MENU_W - 8;

    // vertical: prefer opening ABOVE the button; flip below if not enough room.
    let top = r.top - estH - 6;
    if (top < 8) top = r.bottom + 6;
    if (top + estH > vh - 8) top = Math.max(8, vh - estH - 8);

    setCoords({ left, top });
  };

  const toggle = (e) => {
    e.stopPropagation();
    if (!open) computePlacement();
    setOpen((o) => !o);
  };

  // re-clamp after the menu actually renders (uses real height)
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const m = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let { left, top } = coords;
    if (left + m.width > vw - 8) left = vw - m.width - 8;
    if (left < 8) left = 8;
    if (top + m.height > vh - 8) top = Math.max(8, vh - m.height - 8);
    if (top < 8) top = 8;
    if (left !== coords.left || top !== coords.top) setCoords({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-silver-500/10 transition"
      >
        <MoreVertical size={18} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                className="fixed z-[70] glass-panel p-1"
                style={{ left: coords.left, top: coords.top, width: MENU_W }}
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
              >
                {list.map((item, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 3, backgroundColor: item.danger ? "rgba(155,48,43,0.12)" : "rgba(155,48,43,0.14)" }}
                    onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left rtl:text-right ${
                      item.danger ? "text-crimson-300" : "text-text-primary"
                    }`}
                  >
                    {item.icon && <item.icon size={15} />}
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
