/**
 * 人生当铺 - 个人剖析（单人模式）核心逻辑
 * 完全独立于多人房间模式，纯前端运行
 */

import { ALL_CARDS, getCardDesc } from "./cards";

export { ALL_CARDS, getCardDesc };

export const STAGES = [
  { name: "童年", description: "人生最初的篇章，纯真而懵懂" },
  { name: "少年", description: "青春躁动，开始认识世界" },
  { name: "青年", description: "满怀理想，踏上人生征途" },
  { name: "中年", description: "责任与压力并存的人生中段" },
  { name: "暮年", description: "回望一生，沉淀智慧" },
] as const;

export const ADVERSITY_EVENTS: Record<number, string[]> = {
  0: ["父母离异，缺少家庭温暖", "被同学欺负，变得内向", "生了一场大病，休学半年", "家境贫寒，买不起喜欢的玩具"],
  1: ["高考失利，与梦想大学失之交臂", "初恋分手，心痛欲绝", "沉迷游戏，成绩一落千丈", "被朋友背叛，失去信任"],
  2: ["求职屡屡碰壁，怀疑人生", "创业失败，欠下债务", "被裁员，面临经济压力", "异地恋分手，孤独感袭来"],
  3: ["父母生病，需要大量精力和金钱", "职场瓶颈，晋升无望", "婚姻危机，感情出现裂痕", "孩子叛逆，家庭矛盾频发"],
  4: ["身体每况愈下，疾病缠身", "老友相继离去，孤独感加剧", "退休金不足，生活拮据", "子女远在他乡，无人陪伴"],
};

export type GamePhase = "intro" | "select" | "playing" | "finished";

export interface SoloChoice {
  stageIndex: number;
  stageName: string;
  event: string;
  type: "accept" | "pawn";
  cards: string[];
}

export interface SoloGameState {
  playerName: string;
  phase: GamePhase;
  baseCards: string[];
  initialCards: string[];
  pawnedCards: string[];
  acceptedEvents: number;
  currentStage: number;
  /** 每个阶段用户已经抽到的事件，key 为阶段索引 */
  stageEvents: Record<number, string>;
  choices: SoloChoice[];
  startedAt: number;
  finishedAt?: number;
}

const STORAGE_KEY = "lifecard-solo";

export function drawEventForStage(stageIndex: number): string {
  const events = ADVERSITY_EVENTS[stageIndex] || ["人生无常，命运给你出了一道难题"];
  return events[Math.floor(Math.random() * events.length)];
}

export function getStageEvent(state: SoloGameState, stageIndex: number): string | undefined {
  return state.stageEvents[stageIndex];
}

export function createInitialState(playerName: string): SoloGameState {
  return {
    playerName,
    phase: "intro",
    baseCards: [],
    initialCards: [],
    pawnedCards: [],
    acceptedEvents: 0,
    currentStage: -1,
    stageEvents: {},
    choices: [],
    startedAt: Date.now(),
  };
}

export function loadSoloState(): SoloGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SoloGameState;
  } catch {
    return null;
  }
}

export function saveSoloState(state: SoloGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function clearSoloState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function startGame(state: SoloGameState, selectedCards: string[]): SoloGameState {
  if (selectedCards.length !== 10) return state;
  return {
    ...state,
    phase: "playing",
    baseCards: [...selectedCards],
    initialCards: [...selectedCards],
    currentStage: 0,
    stageEvents: {},
  };
}

export function revealStageEvent(state: SoloGameState, stageIndex: number): SoloGameState {
  if (state.stageEvents[stageIndex]) return state;
  return {
    ...state,
    stageEvents: {
      ...state.stageEvents,
      [stageIndex]: drawEventForStage(stageIndex),
    },
  };
}

export function acceptAdversity(state: SoloGameState): SoloGameState {
  if (state.phase !== "playing" || state.currentStage < 0 || state.currentStage >= STAGES.length) {
    return state;
  }

  const stageIndex = state.currentStage;
  const event = state.stageEvents[stageIndex];
  if (!event) return state;

  const newChoices = state.choices.filter((c) => c.stageIndex !== stageIndex);
  newChoices.push({
    stageIndex,
    stageName: STAGES[stageIndex].name,
    event,
    type: "accept",
    cards: [],
  });

  const isLastStage = stageIndex === STAGES.length - 1;
  return {
    ...state,
    acceptedEvents: state.acceptedEvents + 1,
    choices: newChoices,
    currentStage: isLastStage ? stageIndex : stageIndex + 1,
    phase: isLastStage ? "finished" : "playing",
    finishedAt: isLastStage ? Date.now() : undefined,
  };
}

export function pawnCards(state: SoloGameState, cards: string[]): SoloGameState {
  if (state.phase !== "playing" || state.currentStage < 0 || state.currentStage >= STAGES.length) {
    return state;
  }
  if (cards.length !== 2) return state;

  const stageIndex = state.currentStage;
  const event = state.stageEvents[stageIndex];
  if (!event) return state;

  const newBaseCards = state.baseCards.filter((c) => !cards.includes(c));
  const newPawnedCards = [...state.pawnedCards, ...cards];
  const newChoices = state.choices.filter((c) => c.stageIndex !== stageIndex);
  newChoices.push({
    stageIndex,
    stageName: STAGES[stageIndex].name,
    event,
    type: "pawn" as const,
    cards: [...cards],
  });

  const isLastStage = stageIndex === STAGES.length - 1;
  return {
    ...state,
    baseCards: newBaseCards,
    pawnedCards: newPawnedCards,
    choices: newChoices,
    currentStage: isLastStage ? stageIndex : stageIndex + 1,
    phase: isLastStage ? "finished" : "playing",
    finishedAt: isLastStage ? Date.now() : undefined,
  };
}

// ─── 卡牌分类与价值观画像 ───

export const CARD_CATEGORIES: Record<string, string[]> = {
  关系: ["家人陪伴", "知心挚友", "爱情"],
  自我: ["自信", "好奇心", "自由", "梦想", "安全感"],
  能力: ["才华", "学习能力", "责任心", "幽默感", "热情", "耐心", "正义感"],
  资源: ["健康", "颜值", "财富"],
};

export function getCardCategory(card: string): string {
  for (const [category, cards] of Object.entries(CARD_CATEGORIES)) {
    if (cards.includes(card)) return category;
  }
  return "其他";
}

export interface ValueProfile {
  categories: Record<string, { kept: number; initial: number; pawned: number }>;
  dominantCategory: string;
  pawnOrder: { stageName: string; card: string; category: string }[];
}

export function analyzeValueProfile(
  initialCards: string[],
  pawnedCards: string[],
  choices: SoloChoice[]
): ValueProfile {
  const categories: Record<string, { kept: number; initial: number; pawned: number }> = {};

  // init categories
  Object.keys(CARD_CATEGORIES).forEach((c) => {
    categories[c] = { kept: 0, initial: 0, pawned: 0 };
  });

  initialCards.forEach((card) => {
    const cat = getCardCategory(card);
    if (categories[cat]) categories[cat].initial += 1;
  });

  pawnedCards.forEach((card) => {
    const cat = getCardCategory(card);
    if (categories[cat]) categories[cat].pawned += 1;
  });

  const keptCards = initialCards.filter((c) => !pawnedCards.includes(c));
  keptCards.forEach((card) => {
    const cat = getCardCategory(card);
    if (categories[cat]) categories[cat].kept += 1;
  });

  const dominantCategory = Object.entries(categories)
    .filter(([, v]) => v.initial > 0)
    .sort((a, b) => b[1].kept - a[1].kept)[0]?.[0] || "自我";

  const pawnOrder: { stageName: string; card: string; category: string }[] = [];
  choices
    .filter((c) => c.type === "pawn")
    .sort((a, b) => a.stageIndex - b.stageIndex)
    .forEach((choice) => {
      choice.cards.forEach((card) => {
        pawnOrder.push({
          stageName: choice.stageName,
          card,
          category: getCardCategory(card),
        });
      });
    });

  return { categories, dominantCategory, pawnOrder };
}

export interface DecisionPattern {
  acceptCount: number;
  pawnCount: number;
  earlyPawn: number;
  resilienceScore: number;
  label: string;
  summary: string;
}

export function analyzeDecisionPattern(choices: SoloChoice[]): DecisionPattern {
  const acceptCount = choices.filter((c) => c.type === "accept").length;
  const pawnCount = choices.filter((c) => c.type === "pawn").length;
  const earlyPawn = choices.filter((c) => c.type === "pawn" && c.stageIndex <= 1).length;

  const total = choices.length || 1;
  const resilienceScore = Math.round((acceptCount / total) * 100);

  let label = "平衡型旅人";
  let summary = "";

  if (acceptCount === total) {
    label = "无畏承担者";
    summary = "你选择了在五段人生中全部直面挫折，宁可自己扛着，也不愿交出任何一张珍贵底牌。你内心有着极强的韧性与守护欲，相信自己有足够的力量去消化命运的重量。";
  } else if (pawnCount === total) {
    label = "智慧取舍者";
    summary = "每到命运的岔路口，你都选择用典当换取平顺。这不是软弱，而是一种清醒的生存智慧——你深知有些东西可以放手，才能保护更长远的自己。";
  } else if (resilienceScore >= 60) {
    label = "坚韧守护者";
    summary = "你更倾向于承担挫折，只在必要时才忍痛典当。你的底牌保留率较高，说明那些你最初认定珍贵的事物，你会拼尽全力去守护。";
  } else if (earlyPawn >= 2) {
    label = "早期调适者";
    summary = "你在人生较早阶段就学会了用交换换取安全。这或许意味着你早早就懂得了取舍，也可能是你比同龄人更早经历了成长的代价。";
  } else {
    label = "柔性应变者";
    summary = "你根据每一段人生的具体遭遇做出不同选择，没有固守某一种模式。这种灵活本身，就是一种难得的生命智慧。";
  }

  return { acceptCount, pawnCount, earlyPawn, resilienceScore, label, summary };
}

export function generateInsight(
  playerName: string,
  initialCards: string[],
  pawnedCards: string[],
  choices: SoloChoice[]
): string {
  const pattern = analyzeDecisionPattern(choices);
  const profile = analyzeValueProfile(initialCards, pawnedCards, choices);

  const keptCards = initialCards.filter((c) => !pawnedCards.includes(c));
  const retention = Math.round((keptCards.length / initialCards.length) * 100);

  let valueSentence = "";
  switch (profile.dominantCategory) {
    case "关系":
      valueSentence = "你最不愿放手的是『关系』——家人、挚友与爱情，是你心中最柔软的锚。";
      break;
    case "自我":
      valueSentence = "你最珍视的是『自我』——自信、梦想、好奇心与自由，构成了你灵魂的内核。";
      break;
    case "能力":
      valueSentence = "你最看重的是『能力』——才华、学习与责任心，是你行走世界的底气。";
      break;
    case "资源":
      valueSentence = "你最优先守护的是『资源』——健康、颜值与财富，是你与现实谈判的筹码。";
      break;
    default:
      valueSentence = "你的价值版图非常均衡，没有哪一种事物能完全定义你。";
  }

  return `亲爱的 ${playerName}，这场独自走过的人生当铺之旅， reveals 了一些关于你的真相。你最终保留了 ${retention}% 的初始底牌，说明在你的价值天平上，${valueSentence} 面对 5 段人生挫折，你 ${pattern.acceptCount} 次选择接受、${pattern.pawnCount} 次选择典当，属于「${pattern.label}」。${pattern.summary} 无论典当还是坚守，都是你当下最真实的生命选择。愿你走出当铺后，带着这份觉察，更温柔地善待自己。`;
}
