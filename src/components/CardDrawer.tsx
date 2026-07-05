import { useRef } from "react";
import { getCardDesc } from "@/lib/cards";

interface CardDrawerProps {
  cards: string[];
  pawnedCards: string[];
  selectedCards: string[];
  pawnMode: boolean;
  onToggleCard: (card: string) => void;
}

export default function CardDrawer({
  cards,
  pawnedCards,
  selectedCards,
  pawnMode,
  onToggleCard,
}: CardDrawerProps) {
  const keptCount = cards.length - pawnedCards.length;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -160 : 160;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-pawn-cream/95 backdrop-blur-md border-t border-rose-100/80 p-3 sm:p-4 rounded-t-3xl shadow-floating-deck z-20 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-pawn-dark px-1">
        <span className="flex items-center gap-1">🌿 属于我的人生底牌</span>
        <span className="text-stone-400">保留: {keptCount} / {cards.length}</span>
      </div>

      <div className="relative group">
        {/* Left fade / arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur rounded-full shadow-md border border-rose-100 flex items-center justify-center text-pawn-rose opacity-80 hover:opacity-100 active:scale-95 transition hidden sm:flex"
          aria-label="向左滑动"
        >
          <ChevronLeftIcon />
        </button>

        {/* Right fade / arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur rounded-full shadow-md border border-rose-100 flex items-center justify-center text-pawn-rose opacity-80 hover:opacity-100 active:scale-95 transition hidden sm:flex"
          aria-label="向右滑动"
        >
          <ChevronRightIcon />
        </button>

        {/* Scrollable deck */}
        <div
          ref={scrollRef}
          className="flex space-x-2.5 sm:space-x-3 overflow-x-auto pb-safe pt-0.5 px-1 card-scroller snap-x snap-mandatory"
        >
          {cards.map((card) => {
            const isPawned = pawnedCards.includes(card);
            const isSelected = selectedCards.includes(card);

            let cls =
              "flex-shrink-0 w-[88px] sm:w-24 md:w-28 h-28 sm:h-32 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between select-none relative overflow-hidden text-left snap-center shadow-sm border-2 transition-all duration-300 ";
            if (isPawned) {
              cls += "bg-stone-100/90 border-stone-200 text-stone-400";
            } else if (isSelected) {
              cls += "bg-amber-50/90 border-pawn-gold shadow-gold-glow cursor-pointer";
            } else if (pawnMode) {
              cls += "bg-white border-dashed border-rose-200 hover:border-pawn-gold cursor-pointer";
            } else {
              cls += "bg-white border-pawn-cream hover:shadow-soft-warm hover:-translate-y-1";
            }

            return (
              <div key={card} className={cls} onClick={() => onToggleCard(card)}>
                {isPawned && (
                  <div className="absolute inset-0 flex items-center justify-center rotate-12 pointer-events-none select-none">
                    <span className="border border-rose-300 text-rose-300 font-bold tracking-widest text-[8px] sm:text-[9px] uppercase rounded px-1 py-0.5 bg-white/80">
                      已典当
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold truncate ${
                      isPawned ? "text-stone-400" : "text-pawn-dark"
                    }`}
                  >
                    {card}
                  </span>
                  {!isPawned && <SparkleIcon />}
                </div>
                <p
                  className={`text-[8px] sm:text-[8.5px] leading-snug line-clamp-3 sm:line-clamp-4 ${
                    isPawned ? "text-stone-400/80" : "text-stone-500"
                  }`}
                >
                  {getCardDesc(card)}
                </p>
                <div
                  className={`text-[6px] sm:text-[7px] tracking-wider text-right uppercase font-mono ${
                    isPawned ? "text-stone-300" : "text-stone-400"
                  }`}
                >
                  {isPawned ? "PAWNED" : "KEPT"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[9px] text-stone-400 sm:hidden">
        👈 左右滑动查看全部底牌 👉
      </p>
    </footer>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-pawn-rose" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l1.912 5.886 6.182.046-4.978 3.659 1.874 5.899-4.99-3.642-4.99 3.642 1.874-5.899-4.978-3.659 6.182-.046z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
