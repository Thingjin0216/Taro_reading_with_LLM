"use client";

import { motion } from "motion/react";

/** 고른 순서가 그대로 스프레드 자리가 된다. */
const POSITION_BADGES = ["과거", "현재", "미래"];

interface CardGridProps {
  total: number;
  selected: number[];
  onSelect: (index: number) => void;
  locked: boolean;
}

export function CardGrid({ total, selected, onSelect, locked }: CardGridProps) {
  return (
    <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 sm:gap-2 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
      {Array.from({ length: total }, (_, index) => {
        const order = selected.indexOf(index);
        const isSelected = order >= 0;
        return (
          <li key={index} className="relative">
            <motion.button
              type="button"
              aria-label={`카드 ${index + 1}`}
              aria-pressed={isSelected}
              disabled={locked && !isSelected}
              onClick={() => onSelect(index)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: isSelected || !locked ? 1 : 0.35, y: isSelected ? -10 : 0 }}
              transition={{ delay: isSelected ? 0 : index * 0.005, duration: 0.3 }}
              whileHover={locked ? undefined : { y: isSelected ? -10 : -6 }}
              whileTap={{ scale: 0.96 }}
              className={[
                "card-back relative block aspect-[7/12] w-full rounded-[3px]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
                isSelected
                  ? "brightness-140 shadow-[0_0_28px_rgba(238,217,164,0.75)] ring-2 ring-gold-300"
                  : "cursor-pointer disabled:cursor-default",
              ].join(" ")}
            />
            {isSelected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold-300 bg-night-950 px-2 py-0.5 font-display text-[10px] leading-none text-gold-200"
              >
                {POSITION_BADGES[order]}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
