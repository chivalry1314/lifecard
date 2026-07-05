import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/lib/trpc";
import { getCardDesc } from "@/lib/cards";
import { getRecentRooms } from "@/lib/recent-rooms";
import { RotateCcw } from "lucide-react";

type ReportTab = "mine" | "all";

export default function Report() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportTab>("mine");

  const roomQuery = trpc.room.get.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId }
  );

  const playersQuery = trpc.player.listByRoom.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId }
  );

  const isLoading = roomQuery.isLoading || playersQuery.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pawn-rose border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-pawn-dark/70 text-sm">加载报告中...</p>
        </div>
      </div>
    );
  }

  if (roomQuery.isError || playersQuery.isError) {
    const err = roomQuery.error ?? playersQuery.error;
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft-warm max-w-sm w-full text-center space-y-4">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">出错了</h2>
          <p className="text-xs text-stone-500">{err?.message || "无法加载报告"}</p>
          <button
            onClick={() => {
              roomQuery.refetch();
              playersQuery.refetch();
            }}
            className="w-full py-2.5 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-xl transition"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const room = roomQuery.data;
  const rawPlayers = playersQuery.data || [];

  if (!room) {
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft-warm max-w-sm w-full text-center space-y-4">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">房间不存在</h2>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-xl transition"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // Deduplicate by player name, keep most recent
  const players = Array.from(
    rawPlayers
      .reduce((map, p) => {
        const existing = map.get(p.playerName);
        if (
          !existing ||
          new Date(p.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
        ) {
          map.set(p.playerName, p);
        }
        return map;
      }, new Map<string, (typeof rawPlayers)[number]>())
      .values()
  );

  const hostName = room.hostName;
  const myPlayerName = getRecentRooms().find((r) => r.roomId === roomId)?.playerName;
  const currentPlayer =
    players.find((p) => p.playerName === myPlayerName) ??
    players.find((p) => p.playerName === hostName) ??
    players[0];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-pawn-cream">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-rose-100/60 py-3 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <StoreIcon />
          <span className="serif-title font-bold text-lg tracking-wider text-pawn-dark">
            人生当铺
          </span>
        </div>
        <button
          onClick={() => navigate(`/room/${roomId}`)}
          className="text-xs text-pawn-clay hover:text-pawn-rose font-medium flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          返回房间
        </button>
      </header>

      <main className="flex-grow p-4 max-w-xl mx-auto w-full pb-10 space-y-5 animate-fade-in">
        <div className="bg-gradient-to-br from-[#FFF5F2] to-[#FAF4EF] rounded-3xl p-5 shadow-soft-warm border border-rose-100/50 text-center space-y-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-pawn-rose text-2xl shadow-sm">
            <FileIcon />
          </div>
          <div className="space-y-1">
            <h2 className="serif-title text-xl font-black text-pawn-dark">当铺人生终章</h2>
            <p className="text-xs text-stone-500">漫长旅途结束，你的人生当铺结余清单</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-rose-50/50 flex space-x-1">
          <button
            onClick={() => setActiveTab("mine")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition active:scale-95 ${
              activeTab === "mine"
                ? "bg-pawn-rose text-white"
                : "text-pawn-dark hover:bg-rose-50/50"
            }`}
          >
            我的报告
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition active:scale-95 ${
              activeTab === "all"
                ? "bg-pawn-rose text-white"
                : "text-pawn-dark hover:bg-rose-50/50"
            }`}
          >
            同行者报告
          </button>
        </div>

        {activeTab === "mine" && currentPlayer && (
          <MyReport player={currentPlayer} />
        )}

        {activeTab === "all" && <AllReport players={players} hostName={hostName} />}

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

function MyReport({
  player,
}: {
  player: {
    playerName: string;
    baseCards: string[];
    pawnedCards: string[];
    acceptedEvents?: number;
    stageEvents?: Record<number, string>;
    choices?: {
      stageIndex: number;
      type: "accept" | "pawn";
      cards: string[];
      event?: string;
    }[];
  };
}) {
  const keptCount = player.baseCards.length;
  const pawnedCount = player.pawnedCards.length;
  const total = keptCount + pawnedCount || 10;
  const retention = Math.round((keptCount / total) * 100);
  const accepted = player.acceptedEvents || 0;

  const fallbackSummary = `“亲爱的 ${player.playerName}，看着当铺卷宗，我为你感到深深的骄傲。你最终紧紧抱住了你最珍贵的物件，说明在你温柔恬静的外表下，其实埋藏着一根谁也折不弯的骨骼。一路上，承下 ${accepted} 次磨折的你辛苦了。去沉沉睡一觉吧，明日醒来，当铺之外依然是繁花盛开的长路。”`;

  return (
    <div className="space-y-5">
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

      {/* Per-stage choices */}
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
        <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
          每阶段抉择记录
        </h3>
        <div className="space-y-2.5">
          {player.choices && player.choices.length > 0 ? (
            [...player.choices]
              .sort((a, b) => a.stageIndex - b.stageIndex)
              .map((choice) => (
                <div
                  key={choice.stageIndex}
                  className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-pawn-dark">
                      第 {choice.stageIndex + 1} 阶段
                    </span>
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
                  <div className="text-[10px] text-pawn-clay bg-rose-50 inline-block px-2 py-0.5 rounded-md border border-rose-100">
                    挫折：{choice.event || player.stageEvents?.[choice.stageIndex] || "未知"}
                  </div>
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
              ))
          ) : (
            <span className="text-xs text-stone-400 italic">暂无抉择记录</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
        <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 pb-2 border-b border-rose-50">
          旅程汇总
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-bold text-pawn-sage block mb-1">
              【独自抗下并消化的挫折】
            </span>
            <div className="space-y-1.5 text-xs text-stone-600 font-light">
              {accepted === 0 ? (
                <span className="italic text-stone-400">避开了险途挫折，此路顺遂。</span>
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
                player.pawnedCards.map((card, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[#C99A66]">
                    <span className="text-pawn-gold">✦</span> 典当了：{card}（{getCardDesc(card)}）
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI summary placeholder */}
      <div className="bg-gradient-to-br from-[#FFFDFB] to-amber-50/50 rounded-3xl p-5 border-2 border-amber-100 relative overflow-hidden space-y-3.5">
        <div className="absolute -right-4 -bottom-4 text-6xl text-pawn-gold opacity-10 pointer-events-none select-none">
          <PenIcon />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-pawn-gold flex items-center gap-1.5">
            ✨ 当铺掌柜批注 · 治愈心灵解读
          </span>
          <span className="text-[9px] text-pawn-clay bg-amber-50 px-2 py-0.5 rounded-full font-bold">
            默认寄语
          </span>
        </div>
        <p className="text-xs leading-relaxed text-stone-700 italic font-light">
          {fallbackSummary}
        </p>
      </div>
    </div>
  );
}

function AllReport({
  players,
  hostName,
}: {
  players: {
    playerName: string;
    baseCards: string[];
    pawnedCards: string[];
    acceptedEvents?: number;
    stageEvents?: Record<number, string>;
    choices?: {
      stageIndex: number;
      type: "accept" | "pawn";
      cards: string[];
      event?: string;
    }[];
  }[];
  hostName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-3.5">
        <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5 border-b border-rose-50 pb-2.5">
          在场所有旅人的结局
        </h3>
        <div className="space-y-3.5">
          {players.map((p) => {
            const isHost = p.playerName === hostName;
            const keptCount = p.baseCards.length;
            const total = keptCount + p.pawnedCards.length || 10;
            const retention = Math.round((keptCount / total) * 100);
            const pawnNames = p.pawnedCards.join("、") || "无";
            const stageEntries = [...(p.choices || [])].sort(
              (a, b) => a.stageIndex - b.stageIndex
            );

            return (
              <div
                key={p.playerName}
                className={`p-4 rounded-2xl border transition duration-300 ${
                  isHost ? "bg-[#FFFDFB] border-rose-200" : "bg-stone-50/70 border-stone-200/50"
                } space-y-2.5`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-pawn-dark border-b border-rose-50/50 pb-2">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isHost ? "bg-pawn-rose" : "bg-pawn-sage"}`} />
                    {p.playerName} {isHost && "(主持)"}
                  </span>
                  <span className="text-pawn-clay">底牌保留: {retention}%</span>
                </div>
                <div className="space-y-1 text-[11px] leading-relaxed text-stone-500">
                  <div>
                    💔 承接挫折:{" "}
                    <span className="text-pawn-dark/80 font-medium">{p.acceptedEvents || 0} 场</span>
                  </div>
                  <div>
                    📦 典当珍宝:{" "}
                    <span className="text-pawn-gold font-medium">{pawnNames}</span>
                  </div>
                </div>

                {stageEntries.length > 0 && (
                  <div className="pt-2 border-t border-rose-50/50 space-y-1.5">
                    <span className="text-[10px] font-bold text-pawn-dark block">
                      各阶段抽卡与抉择
                    </span>
                    <div className="space-y-1">
                      {stageEntries.map((choice) => {
                        const event =
                          choice.event || p.stageEvents?.[choice.stageIndex] || "未知";
                        return (
                          <div
                            key={choice.stageIndex}
                            className="text-[10px] leading-relaxed bg-white/60 rounded-lg p-1.5 border border-rose-100/30"
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-pawn-dark">
                                第 {choice.stageIndex + 1} 阶段
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                                  choice.type === "accept"
                                    ? "bg-emerald-50 text-emerald-500"
                                    : "bg-amber-50 text-pawn-gold"
                                }`}
                              >
                                {choice.type === "accept" ? "接受" : "典当"}
                              </span>
                            </div>
                            <div className="text-pawn-clay/90 mb-0.5">💔 {event}</div>
                            {choice.type === "pawn" && choice.cards.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {choice.cards.map((card) => (
                                  <span
                                    key={card}
                                    className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 line-through"
                                  >
                                    {card}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StoreIcon() {
  return (
    <svg className="w-5 h-5 text-pawn-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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
