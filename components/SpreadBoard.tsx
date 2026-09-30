"use client";

import Image from "next/image";
import { m } from "motion/react";
import { getCard } from "@/lib/tarot/deck";
import { SPREAD_LABELS, orientationLabel, type DrawnCard } from "@/lib/tarot/draw";

export function SpreadBoard({ cards }: { cards: DrawnCard[] }) {
  return (
    <ul data-testid="spread" className="grid grid-cols-3 gap-3 sm:gap-6">
      {cards.map((drawn, index) => {
        const card = getCard(drawn.id);
        if (!card) {
          return null;
        }
        const orientation = orientationLabel(drawn.reversed);

        return (
          <li key={drawn.id} className="flex flex-col items-center gap-3">
            <div className="w-full [perspective:1200px]">
              <m.div
                className="relative aspect-[7/12] w-full [transform-style:preserve-3d]"
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ delay: 0.2 + index * 0.35, duration: 0.8, ease: "easeInOut" }}
              >
                <div className="card-face absolute inset-0 overflow-hidden rounded-sm border border-gold-500/40 bg-night-900">
                  <Image
                    src={card.image}
                    alt={`${card.nameKo} ${orientation}`}
                    fill
                    sizes="(max-width: 640px) 30vw, 220px"
                    className={`object-cover ${drawn.reversed ? "rotate-180" : ""}`}
                    priority={index === 0}
                  />
                </div>
                <div className="card-back card-face absolute inset-0 rounded-sm [transform:rotateY(180deg)]" />
              </m.div>
            </div>

            <div className="text-center">
              <p className="font-display text-sm text-gold-300">{SPREAD_LABELS[drawn.position]}</p>
              <p className="mt-0.5 text-xs text-mist-300">{card.nameKo}</p>
              <p className="text-[11px] text-mist-500">{orientation}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
