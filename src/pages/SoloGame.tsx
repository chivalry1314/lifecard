import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useNotification } from "@/providers/notification-context";
import {
  ALL_CARDS,
  getCardDesc,
  STAGES,
  type SoloGameState,
  type SoloChoice,
  createInitialState,
  startGame,
  acceptAdversity,
  pawnCards,
  revealStageEvent,
  getStageEvent,
  saveSoloState,
  loadSoloState,
  clearSoloState,
} from "@/lib/solo-game";
import CardDrawer from "@/components/CardDrawer";

interface ConfirmModalState {
  open: boolean;
  title: string;
  body: string;
  onConfirm?: () => void;
}

export default function SoloGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlName = searchParams.get("name") || "";
  const { success, error, info } = useNotification();
  const [state, setState] = useState<SoloGameState>(() => {
    // 从首页带昵称进入时，清空旧进度并直接进入选牌
    if (urlName) {
      clearSoloState();
      return { ...createInitialState(urlName), phase: "select" };
    }
    const saved = loadSoloState();
    if (saved && saved.phase !== "finished") {
      return saved;
    }
    return { ...createInitialState(""), phase: "intro" };
  });

  const [inputName, setInputName] = useState(state.playerName || urlName);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [pawnMode, setPawnMode] = useState(false);
  const [pawnSelection, setPawnSelection] = useState<string[]>([]);
  const [modal, setModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    body: "",
  });

  useEffect(() => {
    saveSoloState(state);
  }, [state]);

  const updateState = useCallback((updater: (s: SoloGameState) => SoloGameState) => {
    setState((prev) => updater(prev));
  }, []);

  const startNew = useCallback(() => {
    clearSoloState();
    setState({ ...createInitialState(""), phase: "intro" });
    setInputName("");
    setSelectedCards([]);
    setPawnMode(false);
    setPawnSelection([]);
  }, []);

  const handleNameSubmit = useCallback(() => {
    const name = inputName.trim();
    if (!name) {
      error("给自己起个温柔的昵称吧 🌸");
      return;
    }
    if (name.length > 20 || /[<>]/.test(name)) {
      error("昵称格式不正确");
      return;
    }
    setState((prev) => ({ ...prev, playerName: name, phase: "select" }));
  }, [inputName, error]);

  const toggleInitialCard = useCallback((card: string) => {
    setSelectedCards((prev) => {
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
    if (selectedCards.length !== 10) return;
    setModal({
      open: true,
      title: "锁定人生底牌",
      body: `你选择了：${selectedCards.join("、")}。这将是你独自踏上人生旅途时最初的珍宝，确定以此出发吗？`,
      onConfirm: () => {
        updateState((s) => startGame(s, selectedCards));
        success("底牌已锁定", "愿你带着这 10 份珍宝，勇敢前行");
      },
    });
  }, [selectedCards, updateState, success]);

  const handleAccept = useCallback(() => {
    setModal({
      open: true,
      title: "直面当前挫折",
      body: "你决定独自承担这份命运的重量，保留所有心头底牌。",
      onConfirm: () => {
        setPawnMode(false);
        setPawnSelection([]);
        updateState((s) => acceptAdversity(s));
        success("你选择了直面挫折");
      },
    });
  }, [updateState, success]);

  const startPawnMode = useCallback(() => {
    if (state.baseCards.length < 2) {
      error("你的底牌已不足 2 张，只能接受这份挫折");
      return;
    }
    setPawnMode(true);
    setPawnSelection([]);
    info("请在底牌区轻触挑选 2 张要典当的珍宝");
  }, [state.baseCards.length, error, info]);

  const togglePawnCard = useCallback((card: string) => {
    setPawnSelection((prev) => {
      if (prev.includes(card)) {
        return prev.filter((c) => c !== card);
      }
      if (prev.length >= 2) {
        return [prev[1], card];
      }
      return [...prev, card];
    });
  }, []);

  const confirmPawn = useCallback(() => {
    if (pawnSelection.length !== 2) return;
    const cardNames = pawnSelection.join("、");
    setModal({
      open: true,
      title: "完成典当",
      body: `你是否甘愿典当【${cardNames}】，换取本阶段的安宁？一旦典当，便不再追回。`,
      onConfirm: () => {
        updateState((s) => pawnCards(s, pawnSelection));
        setPawnMode(false);
        setPawnSelection([]);
        success("典当已完成", `你交出了：${cardNames}`);
      },
    });
  }, [pawnSelection, updateState, success]);

  const currentStageIndex = state.currentStage;
  const currentEvent =
    currentStageIndex >= 0 && currentStageIndex < STAGES.length
      ? getStageEvent(state, currentStageIndex) || ""
      : "";
  const currentChoice = state.choices.find((c) => c.stageIndex === currentStageIndex);
  const hasRevealedEvent = !!currentEvent;

  // Auto-navigate to report when finished
  useEffect(() => {
    if (state.phase === "finished") {
      const timer = setTimeout(() => navigate("/solo/report"), 1200);
      success("人生终章已至", "正在生成你的个人剖析报告");
      return () => clearTimeout(timer);
    }
  }, [state.phase, navigate, success]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-pawn-cream">
      {/* Header */}
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
          onClick={() => navigate("/")}
          className="text-xs text-pawn-clay hover:text-pawn-rose font-medium"
        >
          返回首页
        </button>
      </header>

      <main
        className={`flex-grow p-4 max-w-xl mx-auto w-full transition-all ${
          state.phase === "playing" ? "pb-[200px] sm:pb-[220px]" : "pb-10"
        }`}
      >
        {state.phase === "intro" && (
          <IntroView
            inputName={inputName}
            onNameChange={setInputName}
            onStart={handleNameSubmit}
          />
        )}

        {state.phase === "select" && (
          <InitialCardSelector
            selectedCards={selectedCards}
            onToggle={toggleInitialCard}
            onConfirm={confirmInitialCards}
          />
        )}

        {state.phase === "playing" && currentStageIndex >= 0 && (
          <StageHeader
            stageName={STAGES[currentStageIndex].name}
            stageSubtitle={STAGES[currentStageIndex].description}
            currentStage={currentStageIndex}
          />
        )}

        {state.phase === "playing" && currentStageIndex >= 0 && hasRevealedEvent && (
          <ActivePlay
            currentEvent={currentEvent}
            currentChoice={currentChoice}
            pawnMode={pawnMode}
            pawnSelection={pawnSelection}
            onAccept={handleAccept}
            onStartPawn={startPawnMode}
            onConfirmPawn={confirmPawn}
          />
        )}

        {state.phase === "playing" && currentStageIndex >= 0 && !hasRevealedEvent && (
          <EventDrawView
            onReveal={() => updateState((s) => revealStageEvent(s, currentStageIndex))}
          />
        )}

        {state.phase === "finished" && (
          <div className="bg-white rounded-3xl p-8 shadow-soft-warm text-center space-y-4 animate-fade-in">
            <h2 className="serif-title text-xl font-bold text-pawn-dark">当铺人生终章</h2>
            <p className="text-xs text-stone-500">漫长旅途结束，正在为你整理个人剖析...</p>
            <button
              onClick={() => navigate("/solo/report")}
              className="w-full py-3 bg-pawn-rose hover:bg-pawn-clay text-white text-sm font-bold rounded-xl transition"
            >
              查看个人剖析报告
            </button>
            <button
              onClick={startNew}
              className="w-full py-3 bg-white border border-stone-200 text-stone-600 text-sm font-bold rounded-xl hover:bg-stone-50 transition"
            >
              重新开始
            </button>
          </div>
        )}
      </main>

      {state.phase === "playing" && (
        <CardDrawer
          cards={[...state.baseCards, ...state.pawnedCards]}
          pawnedCards={state.pawnedCards}
          selectedCards={pawnSelection}
          pawnMode={pawnMode}
          onToggleCard={togglePawnCard}
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

function IntroView({
  inputName,
  onNameChange,
  onStart,
}: {
  inputName: string;
  onNameChange: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <section className="w-full space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-3xl p-6 shadow-soft-warm border border-rose-100/50 text-center space-y-3">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-pawn-rose text-2xl shadow-sm">
          <MirrorIcon />
        </div>
        <h1 className="hand-title text-2xl tracking-wide text-pawn-dark font-medium">
          一个人，也能走进当铺
        </h1>
        <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          关掉所有声音，独自完成这场人生抉择。最后你会得到一份只属于你的价值观画像与心灵批注。
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-pawn-dark flex items-center gap-1.5">
            <UserIcon />
            你的探索昵称
          </label>
          <input
            type="text"
            value={inputName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="例如：镜子前的我"
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && onStart()}
            className="w-full px-4 py-3 bg-pawn-cream/60 rounded-2xl border-2 border-transparent focus-visible:ring-2 focus-visible:ring-pawn-rose/30 focus:border-pawn-rose focus:bg-white outline-none transition duration-300 text-base placeholder:text-stone-400"
          />
        </div>

        <button
          onClick={onStart}
          className="w-full py-3.5 bg-pawn-rose hover:bg-pawn-clay text-white text-sm font-bold rounded-2xl transition shadow-md shadow-rose-100 active:scale-95"
        >
          开始个人剖析
        </button>
      </div>

      <div className="bg-pawn-cream/40 border border-stone-200/50 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
        <h3 className="font-bold text-pawn-dark">单人模式说明</h3>
        <ul className="space-y-2 text-stone-600">
          <li>🧘 无需房间号，进入后直接开始</li>
          <li>🃏 从 18 张卡牌中选出 10 张人生底牌</li>
          <li>🍂 独自经历 5 个人生阶段，每次选择「接受」或「典当」</li>
          <li>🔮 结束后生成专属个人剖析报告</li>
        </ul>
      </div>
    </section>
  );
}

function InitialCardSelector({
  selectedCards,
  onToggle,
  onConfirm,
}: {
  selectedCards: string[];
  onToggle: (card: string) => void;
  onConfirm: () => void;
}) {
  const remaining = 10 - selectedCards.length;

  return (
    <section className="w-full space-y-5 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 text-center space-y-4">
        <div className="w-14 h-14 bg-pawn-cream rounded-full flex items-center justify-center mx-auto text-pawn-rose text-xl">
          <CardsIcon />
        </div>
        <div className="space-y-1">
          <h2 className="serif-title text-xl font-bold text-pawn-dark">挑选你的人生底牌</h2>
          <p className="text-xs text-stone-500">从 18 张珍贵卡牌中，选出 10 张陪你踏上独自的旅程</p>
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
                <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">{getCardDesc(card)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={selectedCards.length !== 10}
        className={`w-full py-3.5 font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2 active:scale-95 ${
          selectedCards.length === 10
            ? "bg-pawn-rose hover:bg-pawn-clay shadow-rose-200 text-white"
            : "bg-stone-300 cursor-not-allowed"
        }`}
      >
        <LockIcon />
        {selectedCards.length === 10
          ? "锁定这 10 张人生底牌"
          : `还需选择 ${remaining} 张`}
      </button>
    </section>
  );
}

function StageHeader({
  stageName,
  stageSubtitle,
  currentStage,
}: {
  stageName: string;
  stageSubtitle: string;
  currentStage: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-soft-warm border border-rose-50/50 flex items-center justify-between animate-fade-in">
      <div className="flex items-center space-x-2">
        <span className="text-pawn-clay text-lg">
          <GlobeIcon />
        </span>
        <div>
          <h4 className="serif-title font-bold text-sm text-pawn-dark">{stageName}</h4>
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
  );
}

function EventDrawView({
  onReveal,
}: {
  onReveal: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);

  const handleSelect = (index: number) => {
    if (revealing) return;
    setSelectedIndex(index);
    setRevealing(true);
    setTimeout(() => {
      onReveal();
    }, 800);
  };

  return (
    <section className="w-full space-y-3 animate-fade-in">
      <div className="bg-white rounded-xl p-3 shadow-soft-warm border border-rose-50/50 text-center space-y-2">
        <div className="w-8 h-8 bg-pawn-cream rounded-full flex items-center justify-center mx-auto text-pawn-rose text-sm">
          <ShuffleIcon />
        </div>
        <div className="space-y-0.5">
          <h2 className="serif-title text-base font-bold text-pawn-dark">命运抽卡</h2>
          <p className="text-[10px] text-stone-500">
            本阶段的挫折卡牌已洗好，请从中抽取一张
          </p>
        </div>
        </div>

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={revealing}
            className={`relative h-20 sm:h-24 rounded-lg border-2 transition-all duration-500 active:scale-95 flex flex-col items-center justify-center ${
              selectedIndex === index
                ? "bg-rose-50 border-pawn-rose shadow-sm shadow-rose-100 [transform:rotateY(180deg)]"
                : selectedIndex !== null
                  ? "bg-stone-100 border-stone-200 opacity-50"
                  : "bg-gradient-to-b from-amber-50 to-pawn-cream border-amber-200 hover:border-pawn-gold hover:shadow-sm"
            }`}
          >
            <span className={`text-lg transition-opacity duration-300 ${selectedIndex === index ? "opacity-0" : "opacity-100"}`}>
              🎴
            </span>
            <span className={`text-[8px] font-bold mt-0.5 transition-opacity duration-300 ${selectedIndex === index ? "opacity-0" : "opacity-100"}`}>
              命运之{["壹", "贰", "叁", "肆", "伍", "陆"][index]}
            </span>
            {selectedIndex === index && revealing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-pawn-rose border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400">
        点击任意一张卡牌，抽取属于你这个阶段的挫折事件
      </p>
    </section>
  );
}

function ActivePlay({
  currentEvent,
  currentChoice,
  pawnMode,
  pawnSelection,
  onAccept,
  onStartPawn,
  onConfirmPawn,
}: {
  currentEvent: string;
  currentChoice?: SoloChoice;
  pawnMode: boolean;
  pawnSelection: string[];
  onAccept: () => void;
  onStartPawn: () => void;
  onConfirmPawn: () => void;
}) {
  const hasActed = !!currentChoice;

  return (
    <section className="w-full space-y-4 animate-fade-in">
      {/* Setback card */}
      <div className="bg-gradient-to-br from-pawn-warm to-[#FDF8F5] rounded-3xl p-5 shadow-soft-warm border-2 border-rose-100/40 relative overflow-hidden space-y-3">
        <div className="absolute right-3 top-3 opacity-5 text-6xl text-pawn-dark pointer-events-none select-none">
          <FrownIcon />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-rose-50 text-pawn-clay px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            遭遇挫折
          </span>
          <span className="text-[10px] text-stone-400">抉择时刻</span>
        </div>
        <div className="space-y-1.5">
          <h3 className="serif-title text-lg font-bold text-pawn-dark tracking-wide">{currentEvent}</h3>
        </div>
      </div>

      {/* Decision panel */}
      <div className="bg-white rounded-3xl p-4.5 shadow-soft-warm border border-rose-50/50 space-y-3">
        <h3 className="text-xs font-bold text-pawn-dark border-b border-rose-50 pb-2 flex items-center justify-between">
          <span>💡 做出你的抉择</span>
          <span className="text-[10px] text-pawn-rose italic">
            {hasActed ? "抉择已定" : pawnMode ? "正在挑选典当底牌" : "未做出选择"}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAccept}
            disabled={hasActed}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition duration-300 space-y-1 active:scale-95 border-2 ${
              currentChoice?.type === "accept"
                ? "bg-emerald-50 border-emerald-400 pointer-events-none"
                : hasActed
                  ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
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
              currentChoice?.type === "pawn" || pawnMode
                ? "bg-amber-100/60 border-pawn-gold pointer-events-none"
                : hasActed
                  ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
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
                已选 {pawnSelection.length} / 2 张
              </span>
              <button
                onClick={onConfirmPawn}
                disabled={pawnSelection.length !== 2}
                className="px-4 py-1.5 bg-pawn-gold disabled:bg-stone-200 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition active:scale-95"
              >
                确认典当
              </button>
            </div>
          </div>
        )}
      </div>

    </section>
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
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 18a6 6 0 0 0 0-12 6 6 0 0 0 0 12z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4 text-pawn-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

function SparkleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
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

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function FrownIcon() {
  return (
    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 11l2 2 4-4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
