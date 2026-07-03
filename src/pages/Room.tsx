import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/lib/trpc";
import { useNotification } from "@/providers/notification-context";
import {
  getRecentRooms,
  addRecentRoom,
} from "@/lib/recent-rooms";
import { getCardDesc, ALL_CARDS } from "@/lib/cards";
import type { RoomPlayer } from "@/components/room/types";

interface ConfirmModalState {
  open: boolean;
  title: string;
  body: string;
  onConfirm?: () => void;
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isHost = searchParams.get("host") === "true";
  const urlName = searchParams.get("name") || "";
  const { success, error, info } = useNotification();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const [playerName] = useState(urlName);
  const [hasJoined, setHasJoined] = useState(false);
  const joinAttemptedRef = useRef(false);
  const [playerToken, setPlayerToken] = useState(() => {
    const recent = getRecentRooms().find(
      (r) => r.roomId === roomId && r.playerName === playerName
    );
    return recent?.playerToken || "";
  });
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [initialSelectedCards, setInitialSelectedCards] = useState<string[]>([]);
  const [pawnMode, setPawnMode] = useState(false);
  const [modal, setModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    body: "",
  });
  const [syncSpin, setSyncSpin] = useState(false);

  const roomQuery = trpc.room.get.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId }
  );

  const playerQuery = trpc.player.get.useQuery(
    { roomId: roomId!, playerName, playerToken },
    {
      enabled: !!roomId && !!playerName && !!playerToken && hasJoined,
    }
  );

  const playersQuery = trpc.player.listByRoom.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId && hasJoined }
  );

  const stageQuery = trpc.game.stageInfo.useQuery(
    { roomId: roomId! },
    {
      enabled:
        !!roomId &&
        roomQuery.data?.status === "playing" &&
        roomQuery.data?.currentStage >= 0,
    }
  );

  // Toast query errors
  const lastQueryErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const queryError =
      roomQuery.error ??
      playerQuery.error ??
      playersQuery.error ??
      stageQuery.error;
    if (queryError && queryError.message !== lastQueryErrorRef.current) {
      lastQueryErrorRef.current = queryError.message;
      error("请求失败", queryError.message);
    }
  }, [roomQuery.error, playerQuery.error, playersQuery.error, stageQuery.error, error]);

  const joinMutation = trpc.player.join.useMutation({
    onSuccess: (data) => {
      setHasJoined(true);
      setPlayerToken(data.playerToken);
      if (roomId && playerName) {
        addRecentRoom({
          roomId,
          playerName,
          isHost,
          playerToken: data.playerToken,
        });
      }
      success("成功加入房间");
    },
    onError: (err) => {
      error("加入失败", err.message);
    },
  });

  const selectCardsMutation = trpc.player.selectCards.useMutation({
    onSuccess: () => {
      playerQuery.refetch();
      playersQuery.refetch();
      setInitialSelectedCards([]);
      success("初始底牌已锁定", "你已选定陪伴一生的 10 张珍宝");
    },
    onError: (err) => {
      error("选择底牌失败", err.message);
    },
  });

  const startMutation = trpc.room.start.useMutation({
    onSuccess: () => {
      roomQuery.refetch();
      stageQuery.refetch();
      success("命运轮盘启动");
    },
    onError: (err) => {
      error("开始游戏失败", err.message);
    },
  });

  const nextStageMutation = trpc.room.nextStage.useMutation({
    onSuccess: (data) => {
      roomQuery.refetch();
      if (data.finished) {
        success("人生终章已至", "正在生成人生报告");
        setTimeout(() => {
          navigate(`/room/${roomId}/report`);
        }, 1500);
      } else {
        success("进入下一段人生旅程");
        stageQuery.refetch();
        playerQuery.refetch();
        setSelectedCards([]);
        setPawnMode(false);
      }
    },
    onError: (err) => {
      error("推进阶段失败", err.message);
    },
  });

  const pawnMutation = trpc.player.pawn.useMutation({
    onSuccess: () => {
      playerQuery.refetch();
      playersQuery.refetch();
      setSelectedCards([]);
      setPawnMode(false);
      success("抉择已锁入命轨", `你已典当：${selectedCards.join("、")}`);
    },
    onError: (err) => {
      error("典当失败", err.message);
    },
  });

  const acceptMutation = trpc.player.accept.useMutation({
    onSuccess: () => {
      playerQuery.refetch();
      playersQuery.refetch();
      success("你选择了直面挫折");
    },
    onError: (err) => {
      error("接受失败", err.message);
    },
  });

  // Auto-join on mount
  useEffect(() => {
    if (
      roomId &&
      playerName &&
      !joinAttemptedRef.current &&
      !hasJoined &&
      !joinMutation.isPending &&
      !joinMutation.isError &&
      !joinMutation.isSuccess
    ) {
      joinAttemptedRef.current = true;
      joinMutation.mutate({ roomId, playerName });
    }
  }, [roomId, playerName, hasJoined, joinMutation]);

  // Manual refresh: refetch all active queries related to this room.
  // Using queryClient.refetchQueries with a predicate guarantees that the
  // same observers tied to useQuery hooks are notified of fresh data.
  const refreshAll = useCallback(async () => {
    if (!roomId) return;
    try {
      setSyncSpin(true);

      await queryClient.refetchQueries({
        predicate: (query) => {
          const key = JSON.stringify(query.queryKey);
          return key.includes(roomId);
        },
      });

      // stageInfo may be disabled until room.status === "playing"; force it.
      try {
        await utils.game.stageInfo.fetch({ roomId });
      } catch {
        // Not playing yet or stage unavailable, ignore
      }

      info("已同步最新状态");
    } catch (err) {
      error("同步失败", err instanceof Error ? err.message : "请检查网络");
    } finally {
      setTimeout(() => setSyncSpin(false), 500);
    }
  }, [queryClient, utils, roomId, info, error]);

  const room = roomQuery.data;
  const player = playerQuery.data;
  const currentEvent = stageQuery.data?.event || "";
  const stageName = stageQuery.data?.name || "";

  const players = useMemo(
    () =>
      Array.from(
        (playersQuery.data || [])
          .reduce((map, p) => {
            const existing = map.get(p.playerName);
            const currentUpdated = p.updatedAt
              ? new Date(p.updatedAt).getTime()
              : 0;
            const existingUpdated = existing?.updatedAt
              ? new Date(existing.updatedAt).getTime()
              : 0;
            if (!existing || currentUpdated > existingUpdated) {
              map.set(p.playerName, p as RoomPlayer);
            }
            return map;
          }, new Map<string, RoomPlayer>())
          .values()
      ),
    [playersQuery.data]
  );

  const currentStage = room?.currentStage ?? -1;
  const actedCount = players.filter(
    (p) => p.lastActionAtStage === currentStage
  ).length;
  const allActed = players.length > 0 && actedCount === players.length;
  const hasActed = player?.lastActionAtStage === currentStage;
  const currentChoiceType =
    hasActed && player?.lastAction ? player.lastAction : null;

  const copyRoomCode = () => {
    if (!roomId) return;
    const dummy = document.createElement("input");
    document.body.appendChild(dummy);
    dummy.value = roomId;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    success("房间号已复制");
  };

  const handleStartGame = useCallback(() => {
    if (!isHost) {
      error("只有主持人可以开始游戏");
      return;
    }
    const recent = getRecentRooms().find(
      (r) => r.roomId === roomId && r.playerName === playerName
    );
    if (!recent?.hostToken) {
      error("主持人身份验证失败");
      return;
    }
    startMutation.mutate({ roomId: roomId!, hostToken: recent.hostToken });
  }, [isHost, roomId, playerName, startMutation, error]);

  const handleNextStage = useCallback(() => {
    if (!isHost) {
      error("只有主持人可以推进阶段");
      return;
    }
    const recent = getRecentRooms().find(
      (r) => r.roomId === roomId && r.playerName === playerName
    );
    if (!recent?.hostToken) {
      error("主持人身份验证失败");
      return;
    }
    nextStageMutation.mutate({ roomId: roomId!, hostToken: recent.hostToken });
  }, [isHost, roomId, playerName, nextStageMutation, error]);

  const handleAccept = useCallback(() => {
    if (!playerToken) {
      error("玩家身份验证失败");
      return;
    }
    if (hasActed) return;
    setModal({
      open: true,
      title: "直面当前挫折",
      body: "你确定将迎难而上，用双肩抗下本阶段命运的折磨，去完整保留所有的心头底牌吗？",
      onConfirm: () => {
        acceptMutation.mutate({ roomId: roomId!, playerName, playerToken });
      },
    });
  }, [playerToken, hasActed, roomId, playerName, acceptMutation, error]);

  const startPawnMode = useCallback(() => {
    if (hasActed) return;
    if ((player?.baseCards.length || 0) < 2) {
      error("你的卡牌余额已不足2张，别无选择，只能硬撑过命运难关...");
      return;
    }
    setSelectedCards([]);
    setPawnMode(true);
    info("请在底牌区域轻触挑选 2 张珍贵卡牌");
  }, [hasActed, player, error, info]);

  const toggleCardSelection = useCallback(
    (card: string) => {
      if (!pawnMode) return;
      setSelectedCards((prev) => {
        if (prev.includes(card)) {
          return prev.filter((c) => c !== card);
        }
        if (prev.length >= 2) {
          return [prev[1], card];
        }
        return [...prev, card];
      });
    },
    [pawnMode]
  );

  const toggleInitialCard = useCallback((card: string) => {
    setInitialSelectedCards((prev) => {
      if (prev.includes(card)) {
        return prev.filter((c) => c !== card);
      }
      if (prev.length >= 10) {
        return [...prev.slice(1), card];
      }
      return [...prev, card];
    });
  }, []);

  const confirmInitialCards = useCallback(() => {
    if (initialSelectedCards.length !== 10 || !playerToken) return;
    setModal({
      open: true,
      title: "锁定初始底牌",
      body: `你选择了：${initialSelectedCards.join("、")}。一旦锁定将无法更改，确定以此开启人生旅程吗？`,
      onConfirm: () => {
        selectCardsMutation.mutate({
          roomId: roomId!,
          playerName,
          playerToken,
          cards: initialSelectedCards,
        });
      },
    });
  }, [initialSelectedCards, playerToken, roomId, playerName, selectCardsMutation]);

  const confirmPawn = useCallback(() => {
    if (selectedCards.length !== 2 || !playerToken) return;
    const cardNames = selectedCards.join("、");
    setModal({
      open: true,
      title: "完成典当交易",
      body: `你是否甘愿典当【${cardNames}】，换取本阶段一世安乐？此去经年，典当物概不退回。`,
      onConfirm: () => {
        pawnMutation.mutate({
          roomId: roomId!,
          playerName,
          playerToken,
          cards: selectedCards,
        });
      },
    });
  }, [selectedCards, playerToken, roomId, playerName, pawnMutation]);

  const isLoading = roomQuery.isLoading || !hasJoined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pawn-rose border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-pawn-dark/70 text-sm">正在加入房间...</p>
        </div>
      </div>
    );
  }

  if (roomQuery.isError || joinMutation.isError) {
    const err = roomQuery.error ?? joinMutation.error;
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft-warm max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-pawn-rose">
            <AlertIcon />
          </div>
          <h2 className="serif-title text-xl font-bold text-pawn-dark">出错了</h2>
          <p className="text-xs text-stone-500">{err?.message || "无法加载房间信息"}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                roomQuery.refetch();
                if (joinMutation.isError) {
                  joinAttemptedRef.current = false;
                  joinMutation.reset();
                }
              }}
              className="flex-1 py-2.5 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-xl transition"
            >
              重试
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-2.5 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-pawn-cream flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-soft-warm max-w-sm w-full text-center space-y-4">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">房间不存在</h2>
          <p className="text-xs text-stone-500">该房间号无效或已过期</p>
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

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-rose-100/60 py-3 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <StoreIcon />
          <span className="serif-title font-bold text-lg tracking-wider text-pawn-dark">
            人生当铺
          </span>
          {isHost && (
            <span className="text-[10px] bg-pawn-rose text-white px-2 py-0.5 rounded-full font-medium">
              主持
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5 bg-pawn-cream/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
          <span className="text-stone-500 scale-90">房间:</span>
          <span className="font-bold tracking-widest text-pawn-dark serif-title">{roomId}</span>
          <button
            onClick={copyRoomCode}
            className="text-pawn-rose hover:text-pawn-clay ml-1 active:scale-90 transition-transform"
            title="复制房间号"
          >
            <CopyIcon />
          </button>
        </div>
      </header>

      <main
        className={`flex-grow p-4 max-w-xl mx-auto w-full transition-all ${
          room.status === "playing" ? "pb-[200px] sm:pb-[220px]" : "pb-10"
        }`}
      >
        {room.status === "waiting" && player && player.baseCards.length === 0 && (
          <InitialCardSelector
            selectedCards={initialSelectedCards}
            onToggle={toggleInitialCard}
            onConfirm={confirmInitialCards}
            isPending={selectCardsMutation.isPending}
          />
        )}

        {room.status === "waiting" && (!player || player.baseCards.length > 0) && (
          <WaitingRoom
            roomId={roomId!}
            hostName={room.hostName}
            players={players}
            playerName={playerName}
            isHost={isHost}
            onStart={handleStartGame}
            onRefresh={refreshAll}
            syncSpin={syncSpin}
            playerCount={players.length}
            isStarting={startMutation.isPending}
          />
        )}

        {room.status === "playing" && (
          <ActivePlay
            stageName={stageName}
            stageSubtitle={getStageSubtitle(room.currentStage)}
            currentStage={room.currentStage}
            currentEvent={currentEvent}
            players={players}
            isHost={isHost}
            hasActed={hasActed}
            currentChoiceType={currentChoiceType}
            pawnMode={pawnMode}
            selectedCards={selectedCards}
            allActed={allActed}
            onAccept={handleAccept}
            onStartPawn={startPawnMode}
            onConfirmPawn={confirmPawn}
            onNextStage={handleNextStage}
            onRefresh={refreshAll}
            syncSpin={syncSpin}
            isNextPending={nextStageMutation.isPending}
          />
        )}

        {room.status === "finished" && (
          <div className="bg-white rounded-3xl p-8 shadow-soft-warm text-center space-y-4 animate-fade-in">
            <h2 className="serif-title text-xl font-bold text-pawn-dark">当铺人生终章</h2>
            <p className="text-xs text-stone-500">漫长旅途结束，正在为你整理人生档案...</p>
            <button
              onClick={() => navigate(`/room/${roomId}/report`)}
              className="w-full py-3 bg-pawn-rose hover:bg-pawn-clay text-white text-sm font-bold rounded-xl transition"
            >
              查看人生报告
            </button>
          </div>
        )}
      </main>

      {room.status === "playing" && player && (
        <CardDrawer
          cards={[...player.baseCards, ...player.pawnedCards]}
          pawnedCards={player.pawnedCards}
          selectedCards={selectedCards}
          pawnMode={pawnMode}
          onToggleCard={toggleCardSelection}
        />
      )}

      {/* Confirm Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-rose-50/50 space-y-3.5 text-center sm:text-left animate-fade-in">
            <h3 className="serif-title text-base font-bold text-pawn-dark">{modal.title}</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">{modal.body}</p>
            <div className="flex justify-center sm:justify-end space-x-2 pt-1.5">
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-pawn-cream rounded-xl transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setModal((m) => ({ ...m, open: false }));
                  modal.onConfirm?.();
                }}
                className="px-4 py-2 text-xs font-bold bg-pawn-rose hover:bg-pawn-clay text-white rounded-xl transition shadow-md shadow-rose-100 active:scale-95"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-views ───

interface WaitingRoomProps {
  roomId: string;
  hostName: string;
  players: RoomPlayer[];
  playerName: string;
  isHost: boolean;
  onStart: () => void;
  onRefresh: () => void;
  syncSpin: boolean;
  playerCount: number;
  isStarting: boolean;
}

function WaitingRoom({
  roomId,
  hostName,
  players,
  playerName,
  isHost,
  onStart,
  onRefresh,
  syncSpin,
  playerCount,
  isStarting,
}: WaitingRoomProps) {
  const allReady = players.length >= 2 && players.every((p) => p.baseCards.length === 10);
  const canStart = allReady && !isStarting;

  return (
    <section className="w-full space-y-5 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 text-center space-y-4">
        <div className="w-14 h-14 bg-pawn-cream rounded-full flex items-center justify-center mx-auto text-pawn-rose text-xl relative">
          <HourglassIcon />
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-sync-pulse" />
        </div>
        <div className="space-y-1">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">等待旅人入座...</h2>
          <p className="text-xs text-stone-500">围坐一圈，告诉朋友们输入下方的房间号加入</p>
        </div>

        <div className="bg-gradient-to-r from-[#FFF5F2] to-[#FAF4EF] rounded-2xl py-3 px-4 border border-rose-100/50 flex items-center justify-between gap-2">
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider text-pawn-clay font-bold block">
              房间连接代码
            </span>
            <span className="text-2xl font-black tracking-widest text-pawn-dark serif-title">
              {roomId}
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="bg-white hover:bg-pawn-cream border border-rose-100 px-3 py-2 rounded-xl text-xs font-semibold text-pawn-clay transition flex items-center gap-1 active:scale-95"
          >
            <RotateIcon spin={syncSpin} />
            同步状态
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-stone-400">等待玩家同步自理中...</span>
          <span className="text-[10px] text-pawn-clay font-medium bg-rose-50 px-2 py-0.5 rounded-full">
            满2人可开局
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-3.5">
        <div className="flex items-center justify-between border-b border-rose-50 pb-2.5">
          <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5">
            <UsersIcon />
            已入座玩家 ({playerCount}/12)
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {players.map((p) => {
            const isSelf = p.playerName === playerName;
            const isReady = p.baseCards.length === 10;
            return (
              <div
                key={p.playerName}
                className={`flex items-center space-x-2.5 p-3 rounded-2xl border transition duration-300 ${
                  isSelf
                    ? "bg-rose-50/70 border-rose-200 shadow-sm shadow-rose-100"
                    : "bg-stone-50/70 border-stone-200/60"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${
                    isSelf ? "bg-pawn-rose" : "bg-pawn-sage"
                  }`}
                >
                  {p.playerName.charAt(0)}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold text-pawn-dark truncate">
                    {p.playerName} {isSelf && <span className="text-[9px] text-pawn-clay">(你)</span>}
                  </p>
                  <p className="text-[9px] text-stone-400 truncate">
                    {p.playerName === hostName
                      ? "🗝️ 掌事房主"
                      : "同游旅人"}
                    {isReady ? (
                      <span className="ml-1 text-emerald-500">✓ 已选底牌</span>
                    ) : (
                      <span className="ml-1 text-amber-500">待选底牌</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isHost ? (
        <div>
          <button
            onClick={onStart}
            disabled={!canStart}
            className={`w-full py-3.5 font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2 active:scale-95 ${
              canStart
                ? "bg-pawn-rose hover:bg-pawn-clay shadow-rose-200 text-white"
                : "bg-stone-300 cursor-not-allowed"
            }`}
          >
            <SparkleIcon />{" "}
            {playerCount < 2
              ? "至少2人才能开始"
              : allReady
                ? "命运轮转，开启当铺游戏"
                : "等待所有人选好底牌"}
          </button>
          <p className="text-[10px] text-center text-pawn-clay mt-2 font-medium">
            {playerCount < 2
              ? "🌸 再邀请一位朋友入座，就可以开启这一生的故事了"
              : allReady
                ? "只有身为房主的你才可以一键开启人生路"
                : "每位玩家都需要从 18 张卡牌中挑选 10 张初始底牌"}
          </p>
        </div>
      ) : (
        <div className="bg-pawn-cream/50 rounded-2xl p-4 text-center text-xs text-stone-500 font-light border border-stone-200/20">
          {allReady
            ? "⌛ 等待主持人开启这一生的故事之旅..."
            : "🃏 还有玩家未选好初始底牌，请稍候..."}
        </div>
      )}
    </section>
  );
}

interface ActivePlayProps {
  stageName: string;
  stageSubtitle: string;
  currentStage: number;
  currentEvent: string;
  players: RoomPlayer[];
  isHost: boolean;
  hasActed: boolean;
  currentChoiceType: "accept" | "pawn" | null;
  pawnMode: boolean;
  selectedCards: string[];
  allActed: boolean;
  onAccept: () => void;
  onStartPawn: () => void;
  onConfirmPawn: () => void;
  onNextStage: () => void;
  onRefresh: () => void;
  syncSpin: boolean;
  isNextPending: boolean;
}

interface InitialCardSelectorProps {
  selectedCards: string[];
  onToggle: (card: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

function InitialCardSelector({
  selectedCards,
  onToggle,
  onConfirm,
  isPending,
}: InitialCardSelectorProps) {
  const remaining = 10 - selectedCards.length;

  return (
    <section className="w-full space-y-5 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 text-center space-y-4">
        <div className="w-14 h-14 bg-pawn-cream rounded-full flex items-center justify-center mx-auto text-pawn-rose text-xl">
          <CardsIcon />
        </div>
        <div className="space-y-1">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">挑选你的人生底牌</h2>
          <p className="text-xs text-stone-500">
            从 18 张珍贵卡牌中，选出 10 张陪你踏上旅程
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold ${
            remaining === 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          已选 {selectedCards.length} / 10 张
          {remaining === 0 && <span>✓</span>}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-3.5">
        <h3 className="text-xs font-bold text-pawn-dark flex items-center gap-1.5">
          <SparkleIcon />
          点击选择你认为最珍贵的 10 张底牌
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {ALL_CARDS.map((card) => {
            const isSelected = selectedCards.includes(card);
            return (
              <button
                key={card}
                onClick={() => onToggle(card)}
                disabled={isPending}
                className={`relative p-3 rounded-2xl border text-left transition active:scale-95 ${
                  isSelected
                    ? "bg-rose-50 border-pawn-rose shadow-sm shadow-rose-100"
                    : "bg-stone-50/70 border-stone-200/60 hover:bg-stone-100/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? "text-pawn-rose" : "text-pawn-dark"
                    }`}
                  >
                    {card}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-pawn-rose text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
                  {getCardDesc(card)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={selectedCards.length !== 10 || isPending}
        className={`w-full py-3.5 font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2 active:scale-95 ${
          selectedCards.length === 10
            ? "bg-pawn-rose hover:bg-pawn-clay shadow-rose-200 text-white"
            : "bg-stone-300 cursor-not-allowed"
        }`}
      >
        {isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            锁定中...
          </>
        ) : (
          <>
            <LockIcon />
            {selectedCards.length === 10
              ? "锁定这 10 张人生底牌"
              : `还需选择 ${remaining} 张`}
          </>
        )}
      </button>
    </section>
  );
}

function ActivePlay({
  stageName,
  stageSubtitle,
  currentStage,
  currentEvent,
  players,
  isHost,
  hasActed,
  currentChoiceType,
  pawnMode,
  selectedCards,
  allActed,
  onAccept,
  onStartPawn,
  onConfirmPawn,
  onNextStage,
  onRefresh,
  syncSpin,
  isNextPending,
}: ActivePlayProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  return (
    <section className="w-full space-y-4 animate-fade-in">
      {/* Stage header */}
      <div className="bg-white rounded-2xl p-3.5 shadow-soft-warm border border-rose-50/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-pawn-clay text-lg">
            <GlobeIcon />
          </span>
          <div>
            <h4 className="serif-title font-bold text-sm text-pawn-dark">
              {stageName}
            </h4>
            <p className="text-[8px] text-stone-400 uppercase tracking-widest">{stageSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          {[0, 1, 2, 3, 4].map((idx) => {
            let cls = "w-2 h-2 rounded-full transition-all duration-300 ";
            if (idx === currentStage) cls += "bg-pawn-rose scale-125 shadow";
            else if (idx < currentStage) cls += "bg-pawn-sage";
            else cls += "bg-stone-200";
            return <div key={idx} className={cls} />;
          })}
        </div>
      </div>

      {/* Setback card */}
      <div className="bg-gradient-to-br from-pawn-warm to-[#FDF8F5] rounded-3xl p-5 shadow-soft-warm border-2 border-rose-100/40 relative overflow-hidden space-y-3">
        <div className="absolute right-3 top-3 opacity-5 text-6xl text-pawn-dark pointer-events-none select-none">
          <FrownIcon />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-rose-50 text-pawn-clay px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            遭遇挫折
          </span>
          <button
            onClick={onRefresh}
            className="text-stone-400 hover:text-pawn-clay transition text-xs flex items-center gap-1 active:scale-95"
          >
            <RotateIcon spin={syncSpin} /> 同步状态
          </button>
        </div>
        <div className="space-y-1.5">
          <h3 className="serif-title text-lg font-bold text-pawn-dark tracking-wide">
            {currentEvent}
          </h3>
        </div>
      </div>

      {/* Decision panel */}
      <div className="bg-white rounded-3xl p-4.5 shadow-soft-warm border border-rose-50/50 space-y-3">
        <h3 className="text-xs font-bold text-pawn-dark border-b border-rose-50 pb-2 flex items-center justify-between">
          <span>💡 做出你的抉择</span>
          <span className="text-[10px] text-pawn-rose italic">
            {hasActed ? "抉择已定" : "未做出选择"}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAccept}
            disabled={hasActed}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition duration-300 space-y-1 active:scale-95 border-2 ${
              currentChoiceType === "accept"
                ? "bg-emerald-50 border-emerald-400 pointer-events-none"
                : "bg-pawn-cream/40 hover:bg-pawn-cream/80 border-stone-200/80"
            }`}
          >
            <span className="text-pawn-sage text-xl">
              <ShieldCheckIcon />
            </span>
            <span className="font-bold text-xs text-pawn-dark">直面并接受</span>
            <span className="text-[8px] text-stone-400 text-center font-light leading-tight">
              保留全部底牌
            </span>
          </button>

          <button
            onClick={onStartPawn}
            disabled={hasActed}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition duration-300 space-y-1 active:scale-95 border-2 ${
              currentChoiceType === "pawn" || pawnMode
                ? "bg-amber-100/60 border-pawn-gold pointer-events-none"
                : "bg-amber-50/20 hover:bg-amber-50/50 border-stone-200/80"
            }`}
          >
            <span className="text-pawn-gold text-xl">
              <PlusIcon />
            </span>
            <span className="font-bold text-xs text-pawn-dark">典当2张底牌</span>
            <span className="text-[8px] text-stone-400 text-center font-light leading-tight">
              抵消此阶段挫折
            </span>
          </button>
        </div>

        {pawnMode && (
          <div className="border border-amber-100 bg-amber-50/10 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
            <p className="text-[10px] text-stone-500 text-center leading-normal">
              💡 <strong>请在最下方底牌区</strong> 点击选中要典当的{" "}
              <span className="text-pawn-clay font-bold text-xs">2</span> 张珍贵卡牌
            </p>
            <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-rose-100/50">
              <span className="text-xs text-pawn-clay font-bold">
                已选 {selectedCards.length} / 2 张
              </span>
              <button
                onClick={onConfirmPawn}
                disabled={selectedCards.length !== 2}
                className="px-4 py-1.5 bg-pawn-gold disabled:bg-stone-200 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition active:scale-95"
              >
                确认典当
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress tracker */}
      <div className="bg-white rounded-3xl p-4.5 shadow-soft-warm border border-rose-50/50 space-y-2.5">
        <div className="flex items-center justify-between border-b border-rose-50 pb-2">
          <span className="text-xs font-bold text-pawn-dark flex items-center gap-1">
            <ClockIcon />
            同行旅人的进度
          </span>
          <span className="text-[8px] text-stone-400">点击玩家查看底牌</span>
        </div>
        <div className="space-y-1.5">
          {players.map((p) => {
            const done = p.lastActionAtStage === currentStage;
            const expanded = expandedPlayer === p.playerName;
            return (
              <div
                key={p.playerName}
                className="rounded-xl bg-stone-50 border border-stone-200/40 text-xs overflow-hidden"
              >
                <button
                  onClick={() => setExpandedPlayer(expanded ? null : p.playerName)}
                  className="w-full flex items-center justify-between p-2 active:scale-[0.99] transition"
                >
                  <span className="font-medium text-pawn-dark flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        done ? "bg-emerald-400" : "bg-amber-300 animate-pulse"
                      }`}
                    />
                    {p.playerName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {done ? (
                      <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        已完成
                      </span>
                    ) : (
                      <span className="text-stone-400 italic text-[10px]">考量中...</span>
                    )}
                    <span
                      className={`text-stone-400 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDownIcon />
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="px-2 pb-2 animate-fade-in">
                    <div className="bg-white rounded-xl p-2.5 border border-rose-100/40 space-y-2">
                      {/* Current stage choice */}
                      <div>
                        <span className="text-[9px] font-bold text-pawn-dark block mb-1">
                          本阶段选择
                        </span>
                        {(() => {
                          const choice = p.choices?.find(
                            (c) => c.stageIndex === currentStage
                          );
                          if (!choice) {
                            return (
                              <span className="text-[9px] text-stone-400 italic">
                                尚未选择
                              </span>
                            );
                          }
                          if (choice.type === "accept") {
                            return (
                              <div className="text-[9px] text-pawn-sage bg-emerald-50 inline-block px-2 py-0.5 rounded-md border border-emerald-100">
                                直面并接受挫折
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1">
                              <div className="text-[9px] text-pawn-gold bg-amber-50 inline-block px-2 py-0.5 rounded-md border border-amber-100">
                                典当 {choice.cards.length} 张底牌
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {choice.cards.map((card) => (
                                  <span
                                    key={card}
                                    className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100 line-through"
                                  >
                                    {card}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {p.baseCards.length > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-pawn-sage block mb-1">
                            保留底牌（{p.baseCards.length} 张）
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.baseCards.map((card) => (
                              <span
                                key={card}
                                className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100"
                              >
                                {card}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {p.pawnedCards.length > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-pawn-gold block mb-1">
                            已典当（{p.pawnedCards.length} 张）
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.pawnedCards.map((card) => (
                              <span
                                key={card}
                                className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100 line-through"
                              >
                                {card}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Host panel */}
      {isHost && (
        <div className="bg-gradient-to-r from-amber-50/60 to-rose-50/60 rounded-3xl p-5 border border-rose-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pawn-dark flex items-center gap-1">
              🗝️ 房主控场面板
            </span>
            <span className="text-[10px] text-stone-500 font-medium">
              {players.filter((p) => p.lastActionAtStage === currentStage).length} / {players.length} 人就绪
            </span>
          </div>
          <button
            onClick={onNextStage}
            disabled={!allActed || isNextPending}
            className={`w-full py-3 text-white text-xs font-bold rounded-xl shadow-lg transition tracking-widest flex items-center justify-center gap-2 active:scale-95 ${
              allActed && !isNextPending
                ? "bg-pawn-rose cursor-pointer hover:bg-pawn-clay"
                : "bg-stone-300 cursor-not-allowed"
            }`}
          >
            <ArrowRightIcon /> 前往下一段人生旅程
          </button>
          <p className="text-[9px] text-center text-pawn-clay font-medium">
            {allActed
              ? "🎉 所有的抉择均已被收纳，可以开启下一个纪元了！"
              : "必须所有玩家完成抉择，主持人才能推进阶段"}
          </p>
        </div>
      )}
    </section>
  );
}

interface CardDrawerProps {
  cards: string[];
  pawnedCards: string[];
  selectedCards: string[];
  pawnMode: boolean;
  onToggleCard: (card: string) => void;
}

function CardDrawer({
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

// ─── Helpers ───

function getStageSubtitle(stage: number): string {
  const map = ["Childhood", "Youth", "Adulthood", "Midlife", "Elderly"];
  return map[stage] || "";
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

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h14" />
      <path d="M5 22h14" />
      <path d="M19 2v4c0 3-3 6-7 6s-7-3-7-6V2" />
      <path d="M5 22v-4c0-3 3-6 7-6s7 3 7 6v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4 text-pawn-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function RotateIcon({ spin }: { spin: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 ${spin ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-pawn-rose" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l1.912 5.886 6.182.046-4.978 3.659 1.874 5.899-4.99-3.642-4.99 3.642 1.874-5.899-4.978-3.659 6.182-.046z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function FrownIcon() {
  return (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
      <line x1="1" y1="18" x2="3" y2="18" />
      <line x1="21" y1="18" x2="23" y2="18" />
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
      <line x1="23" y1="22" x2="1" y2="22" />
      <line x1="16" y1="5" x2="16" y2="5" />
      <line x1="8" y1="5" x2="8" y2="5" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 11l2 2 4-4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-pawn-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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

function ChevronDownIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
