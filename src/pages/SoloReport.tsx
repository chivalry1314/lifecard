import { useState } from "react";
import { useNavigate } from "react-router";
import { RotateCcw } from "lucide-react";
import {
  getCardDesc,
  type SoloGameState,
  loadSoloState,
  clearSoloState,
  analyzeValueProfile,
  analyzeDecisionPattern,
  generateInsight,
  getCardCategory,
} from "@/lib/solo-game";

export default function SoloReport() {
  const navigate = useNavigate();
  const [state] = useState<SoloGameState | null>(() => loadSoloState());

  if (!state) {
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft-warm max-w-sm w-full text-center space-y-4">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">暂无剖析记录</h2>
          <p className="text-xs text-stone-500">你还没有完成一次个人剖析之旅。</p>
          <button
            onClick={() => navigate("/solo")}
            className="w-full py-2.5 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-xl transition"
          >
            开始个人剖析
          </button>
        </div>
      </div>
    );
  }

  const handleRestart = () => {
    clearSoloState();
    navigate("/solo");
  };

  const keptCards = state.initialCards.filter((c) => !state.pawnedCards.includes(c));
  const total = state.initialCards.length || 10;
  const keptCount = keptCards.length;
  const pawnedCount = state.pawnedCards.length;
  const retention = Math.round((keptCount / total) * 100);
  const accepted = state.acceptedEvents;

  const profile = analyzeValueProfile(state.initialCards, state.pawnedCards, state.choices);
  const pattern = analyzeDecisionPattern(state.choices);
  const insight = generateInsight(
    state.playerName,
    state.initialCards,
    state.pawnedCards,
    state.choices
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-pawn-cream">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-rose-100/60 py-3 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <StoreIcon />
          <span className="serif-title font-bold text-lg tracking-wider text-pawn-dark">
            人生当铺
          </span>
          <span className="text-[10px] bg-amber-100 text-pawn-gold px-2 py-0.5 rounded-full font-medium">
            个人剖析
          </span>
        </div>
        <button
          onClick={handleRestart}
          className="text-xs text-pawn-clay hover:text-pawn-rose font-medium flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重新开始
        </button>
      </header>

      <main className="flex-grow p-4 max-w-xl mx-auto w-full pb-10 space-y-5 animate-fade-in">
        <div className="bg-gradient-to-br from-rose-50 to-[#FAF4EF] rounded-3xl p-5 shadow-soft-warm border border-rose-100/50 text-center space-y-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-pawn-rose text-2xl shadow-sm">
            <MirrorIcon />
          </div>
          <div className="space-y-1">
            <h2 className="serif-title text-xl font-black text-pawn-dark">{state.playerName} 的人生剖析</h2>
            <p className="text-xs text-stone-500">这是一场只属于你的当铺之旅</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 grid grid-cols-2 gap-3.5">
          <div className="text-center space-y-0.5 border-r border-rose-50/80">
            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">
              底牌保留率
            </span>
            <span className="text-3xl font-black serif-title text-pawn-clay">{retention}%</span>
            <span className="text-[9px] text-stone-500 block">{keptCount}/{total} 张底牌</span>
          </div>
          <div className="text-center space-y-0.5">
            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">
              面对挫折数
            </span>
            <span className="text-3xl font-black serif-title text-pawn-sage">{accepted} 场</span>
            <span className="text-[9px] text-stone-500 block font-light">选择独自抗下</span>
          </div>
        </div>

        {/* Value Profile */}
        <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
          <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
            <CompassIcon />
            价值观画像
          </h3>

          <div className="flex items-center justify-center">
            <div className="bg-amber-50 text-pawn-gold px-4 py-2 rounded-full text-sm font-bold">
              你是「{profile.dominantCategory}守护者」
            </div>
          </div>

          <div className="space-y-2.5">
            {Object.entries(profile.categories)
              .filter(([, v]) => v.initial > 0)
              .sort((a, b) => b[1].kept - a[1].kept)
              .map(([category, data]) => {
                const ratio = data.initial > 0 ? Math.round((data.kept / data.initial) * 100) : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-pawn-dark">{category}</span>
                      <span className="text-stone-400">保留 {ratio}% ({data.kept}/{data.initial})</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pawn-rose rounded-full transition-all duration-1000"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Decision Pattern */}
        <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
          <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
            <CompassIcon />
            决策模式
          </h3>

          <div className="flex items-center justify-center">
            <div className="bg-amber-50 text-pawn-gold px-4 py-2 rounded-full text-sm font-bold">
              {pattern.label}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-stone-50 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-stone-400 block">接受</span>
              <span className="text-lg font-bold text-pawn-sage">{pattern.acceptCount}</span>
            </div>
            <div className="bg-stone-50 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-stone-400 block">典当</span>
              <span className="text-lg font-bold text-pawn-gold">{pattern.pawnCount}</span>
            </div>
            <div className="bg-stone-50 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[10px] text-stone-400 block">韧性指数</span>
              <span className="text-lg font-bold text-pawn-rose">{pattern.resilienceScore}</span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-stone-600 font-light bg-pawn-cream/40 rounded-xl p-3">
            {pattern.summary}
          </p>
        </div>

        {/* Per-stage choices */}
        <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
          <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
            <ClockIcon />
            每阶段抉择记录
          </h3>
          <div className="space-y-2.5">
            {state.choices && state.choices.length > 0 ? (
              [...state.choices]
                .sort((a, b) => a.stageIndex - b.stageIndex)
                .map((choice) => (
                  <div
                    key={choice.stageIndex}
                    className="flex items-start justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-pawn-dark block mb-0.5">
                        {choice.stageName}
                      </span>
                      <span className="text-[10px] text-stone-400 block mb-1">{choice.event}</span>
                      {choice.type === "accept" ? (
                        <span className="text-pawn-sage">直面并接受挫折</span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-pawn-gold block">典当以下底牌：</span>
                          <div className="flex flex-wrap gap-1">
                            {choice.cards.map((card) => (
                              <span
                                key={card}
                                className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 line-through"
                              >
                                {card}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        choice.type === "accept"
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-amber-50 text-pawn-gold"
                      }`}
                    >
                      {choice.type === "accept" ? "接受" : "典当"}
                    </span>
                  </div>
                ))
            ) : (
              <span className="text-xs text-stone-400 italic">暂无抉择记录</span>
            )}
          </div>
        </div>

        {/* Journey summary */}
        <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
          <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
            <WalletIcon />
            旅程汇总
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-pawn-sage block mb-1">
                【独自抗下并消化的挫折】
              </span>
              <div className="space-y-1.5 text-xs text-stone-600 font-light">
                {accepted === 0 ? (
                  <span className="italic text-stone-400">此路你选择了用交换换取平顺。</span>
                ) : (
                  <span>{accepted} 次选择直面挫折</span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-stone-100/50 mt-2">
              <span className="text-[10px] font-bold text-pawn-gold block mb-1">
                【永远遗留在当铺的珍宝】
              </span>
              <div className="space-y-1.5 text-xs text-stone-600 font-light">
                {pawnedCount === 0 ? (
                  <span className="italic text-stone-400">完美无缺，手里依然紧攥着一切。</span>
                ) : (
                  state.pawnedCards.map((card, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[#C99A66]">
                      <span className="text-pawn-gold">✦</span> 典当了：{card}（{getCardCategory(card)} · {getCardDesc(card)}）
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="bg-gradient-to-br from-[#FFFDFB] to-amber-50/50 rounded-3xl p-5 border-2 border-amber-100 relative overflow-hidden space-y-3.5">
          <div className="absolute -right-4 -bottom-4 text-6xl text-pawn-gold opacity-10 pointer-events-none select-none">
            <PenIcon />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pawn-gold flex items-center gap-1.5">
              ✨ 当铺掌柜批注 · 个人心灵解读
            </span>
            <span className="text-[9px] text-pawn-clay bg-amber-50 px-2 py-0.5 rounded-full font-bold">
              专属生成
            </span>
          </div>
          <p className="text-xs leading-relaxed text-stone-700 italic font-light whitespace-pre-line">
            {insight}
          </p>
        </div>

        <button
          onClick={handleRestart}
          className="w-full py-3.5 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-2xl transition shadow-md shadow-rose-100 active:scale-95"
        >
          再来一次个人剖析
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs font-bold rounded-2xl transition shadow-sm text-center active:scale-95"
        >
          返回当铺前台
        </button>
      </main>
    </div>
  );
}

// ─── Icons ───

function StoreIcon() {
  return (
    <svg className="w-5 h-5 text-pawn-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MirrorIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 18a6 6 0 0 0 0-12 6 6 0 0 0 0 12z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="w-4 h-4 text-pawn-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-pawn-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="w-4 h-4 text-pawn-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
