import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Car, ChevronLeft, ChevronRight, Gauge, Fuel, Cog, Calendar } from "lucide-react";
import { Badge } from "./ui.jsx";
import { formatAmount, formatUsd, formatRate, ENERGY_LABELS, GEARBOX_LABELS, STATUS_LABELS, STATUS_COLORS } from "../utils/format.js";

export function CarImage({ images = [], className = "", heightClass = "h-44" }) {
  const [[idx, dir], setState] = useState([0, 0]);
  const hasImages = images && images.length > 0;
  const go = (delta) => setState(([i]) => [(i + delta + images.length) % images.length, delta]);

  return (
    <div className={`relative ${heightClass} bg-gradient-to-br from-crimson-950/50 to-steel-950 overflow-hidden group ${className}`}>
      {hasImages ? (
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={idx}
            src={images[idx]}
            alt=""
            custom={dir}
            initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -40 : 40 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </AnimatePresence>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(155,48,43,0.05) 0px, rgba(155,48,43,0.05) 1px, transparent 1px, transparent 10px)" }}
        >
          <motion.div animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <Car size={48} className="text-crimson-500/50" />
          </motion.div>
        </div>
      )}
      {hasImages && images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-steel-950/60 rounded-full p-1 text-white">
            <ChevronLeft size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-steel-950/60 rounded-full p-1 text-white">
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-crimson-400" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// `priceUsd` / `oldPriceUsd`: pass { usd, rate } when the car was priced in
// dollars — the card then leads with the dollar figure and shows the dinar
// equivalent (and the rate) underneath.
export default function CarCard({ car, onClick, action, actionLabel, price, oldPrice, priceUsd, oldPriceUsd }) {
  const { t } = useTranslation();
  actionLabel = actionLabel || t("showroom.viewDetails");
  const cardClickable = onClick && !action;
  const hasUsd = !!(priceUsd && Number(priceUsd.usd) > 0);
  const hasOldUsd = !!(oldPriceUsd && Number(oldPriceUsd.usd) > 0);
  return (
    <motion.div
      className={`glass-card overflow-hidden flex flex-col ${cardClickable ? "cursor-pointer" : ""}`}
      whileHover={{ y: -4, boxShadow: "0 20px 60px rgba(155,48,43,0.25), 0 0 0 1px rgba(155,48,43,0.5)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={cardClickable ? () => onClick(car) : undefined}
    >
      <div className="relative">
        <CarImage images={car.images} />
        <motion.div
          className="absolute top-3 right-3 z-10"
          initial={{ opacity: 0, scale: 0.7, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
        >
          <Badge color={STATUS_COLORS[car.status]}>{STATUS_LABELS[car.status]}</Badge>
        </motion.div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="heading text-base text-text-primary truncate">{car.brand} {car.model}</h3>
        <div className="flex flex-wrap gap-1.5 my-3">
          {car.year && <Badge color="muted"><Calendar size={11} /> {car.year}</Badge>}
          {car.energy && <Badge color="muted"><Fuel size={11} /> {ENERGY_LABELS[car.energy]}</Badge>}
          {car.gearbox && <Badge color="muted"><Cog size={11} /> {GEARBOX_LABELS[car.gearbox]}</Badge>}
          {car.mileage != null && <Badge color="muted"><Gauge size={11} /> {formatAmount(car.mileage, "km")}</Badge>}
        </div>
        {car.color && <p className="text-xs text-text-muted mb-2">{t("car.color")} : {car.color}</p>}

        <div className="mt-auto pt-3 border-t border-silver-500/14">
          {price != null && (
            <div className="mb-3">
              {oldPrice != null && oldPrice > price && (
                <span className="text-sm text-text-muted line-through mr-2 rtl:mr-0 rtl:ml-2">
                  {hasOldUsd ? formatUsd(oldPriceUsd.usd) : formatAmount(oldPrice)}
                </span>
              )}
              <span className="text-xl font-black text-[#5FBE9A]">
                {hasUsd ? formatUsd(priceUsd.usd) : formatAmount(price)}
              </span>
              {hasUsd && (
                <span className="block text-xs text-text-muted mt-0.5">
                  {formatAmount(price)}
                  {priceUsd.rate ? ` · ${formatRate(priceUsd.rate)}` : ""}
                </span>
              )}
            </div>
          )}
          {action && (
            <button onClick={() => action(car)} className="btn-primary w-full text-xs">{actionLabel}</button>
          )}
          {onClick && !action && (
            <button onClick={() => onClick(car)} className="btn-ghost w-full text-xs">{actionLabel}</button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
