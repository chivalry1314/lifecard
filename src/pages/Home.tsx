import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/lib/trpc";
import { useNotification } from "@/providers/notification-context";
import {
  getRecentRooms,
  addRecentRoom,
  removeRecentRoom,
  clearRecentRooms,
  type RecentRoom,
} from "@/lib/recent-rooms";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error } = useNotification();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(
    searchParams.get("room")?.toUpperCase() || ""
  );
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(() =>
    getRecentRooms()
  );

  const createRoom = trpc.room.create.useMutation({
    onSuccess: (data) => {
      success("房间创建成功", `房间号：${data.roomId}`);
      addRecentRoom({
        roomId: data.roomId,
        playerName: nickname.trim(),
        isHost: true,
        hostToken: data.hostToken,
      });
      navigate(
        `/room/${data.roomId}?host=true&name=${encodeURIComponent(nickname.trim())}`
      );
    },
    onError: (err) => {
      error("创建失败", err.message);
    },
  });

  const validateName = (name: string) => {
    if (!name) {
      error("给自己起个温柔的昵称吧 🌸");
      return false;
    }
    if (name.length > 20 || /[<>]/.test(name)) {
      error("昵称格式不正确");
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    const name = nickname.trim();
    if (!validateName(name)) return;
    createRoom.mutate({ hostName: name });
  };

  const handleJoin = () => {
    const name = nickname.trim();
    const code = roomCode.trim().toUpperCase();
    if (!validateName(name)) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      error("请输入6位房间号");
      return;
    }
    navigate(`/room/${code}?name=${encodeURIComponent(name)}`);
  };

  const handleFastRejoin = (item: RecentRoom) => {
    setNickname(item.playerName);
    setRoomCode(item.roomId);
    navigate(
      `/room/${item.roomId}?${item.isHost ? "host=true&" : ""}name=${encodeURIComponent(
        item.playerName
      )}`
    );
  };

  const handleRemove = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentRoom(roomId);
    setRecentRooms(getRecentRooms());
  };

  const handleClear = () => {
    clearRecentRooms();
    setRecentRooms([]);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-rose-100/60 py-3 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <StoreIcon />
          <span className="serif-title font-bold text-lg tracking-wider text-pawn-dark">
            人生当铺
          </span>
          <span className="text-[10px] bg-rose-100 text-pawn-clay px-2 py-0.5 rounded-full font-medium">
            线上聚会版
          </span>
        </div>
      </header>

      <main className="flex-grow p-4 max-w-xl mx-auto w-full pb-10">
        <section className="w-full space-y-5 animate-fade-in">
          {/* Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-rose-100 to-amber-100 p-6 shadow-soft-warm text-center space-y-3">
            <div className="absolute -right-6 -bottom-6 text-9xl text-white/20 pointer-events-none select-none">
              <ShieldIcon />
            </div>
            <h1 className="hand-title text-3xl tracking-wide text-pawn-dark mt-2 font-medium">
              用底牌，换取命运的偏心
            </h1>
            <p className="text-xs text-pawn-dark/80 max-w-sm mx-auto leading-relaxed">
              人生就像一场当铺游戏：你手握 10 张珍宝底牌，却在成长中遭遇重重挫折。是「接受」它，还是用 2 张底牌「典当」换取平安？
            </p>
            <div className="inline-block bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-pawn-clay">
              ✨ 治愈心理卡牌 · 2-12人线下围坐体验
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl p-5 shadow-soft-warm border border-rose-50/50 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pawn-dark flex items-center gap-1.5">
                <UserIcon />
                你的游戏昵称 (必填)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：桃桃气泡水"
                maxLength={20}
                className="w-full px-4 py-3 bg-pawn-cream/60 rounded-2xl border-2 border-transparent focus-visible:ring-2 focus-visible:ring-pawn-rose/30 focus:border-pawn-rose focus:bg-white outline-none transition duration-300 text-base placeholder:text-stone-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Join */}
              <div className="bg-pawn-cream/40 border border-rose-100/50 rounded-2xl p-4 flex flex-col justify-between hover:border-pawn-rose/60 transition-all">
                <div className="space-y-1">
                  <span className="text-pawn-rose text-lg">
                    <LoginIcon />
                  </span>
                  <h3 className="text-sm font-bold text-pawn-dark">加入已有房间</h3>
                  <p className="text-[10px] text-stone-500">
                  {searchParams.get("room")
                    ? "房间号已自动填好，输入昵称即可加入"
                    : "输入朋友发你的6位号码"}
                </p>
                </div>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    )
                  }
                  placeholder="输入 6 位房间号"
                  maxLength={6}
                  className="w-full mt-3 text-center tracking-widest text-base py-2 px-3 bg-white border border-rose-100 rounded-xl focus:border-pawn-rose outline-none"
                />
                <button
                  onClick={handleJoin}
                  className="w-full mt-2.5 py-3 bg-pawn-rose hover:bg-pawn-clay text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-100 active:scale-[0.97]"
                >
                  加入游戏
                </button>
              </div>

              {/* Create */}
              <div className="bg-gradient-to-b from-[#FDF8F5] to-amber-50/50 border border-amber-100 rounded-2xl p-4 flex flex-col justify-between hover:border-pawn-gold/60 transition-all">
                <div className="space-y-1">
                  <span className="text-pawn-gold text-lg">
                    <LockIcon />
                  </span>
                  <h3 className="text-sm font-bold text-pawn-dark">创建新房间</h3>
                  <p className="text-[10px] text-stone-500">作为主持人开启一局新游戏</p>
                </div>
                <div className="mt-6 sm:mt-12"></div>
                <button
                  onClick={handleCreate}
                  disabled={createRoom.isPending}
                  className="w-full py-3 bg-pawn-gold hover:bg-[#C99A66] disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition shadow-md shadow-amber-100 active:scale-[0.97]"
                >
                  {createRoom.isPending ? "创建中..." : "创建并进入"}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          {recentRooms.length > 0 && (
            <div className="bg-white/50 border border-rose-100/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-pawn-dark/80 flex items-center gap-1.5">
                  <ClockIcon />
                  最近回到过的房间
                </h4>
                <button
                  onClick={handleClear}
                  className="text-[10px] text-stone-400 hover:text-pawn-rose font-medium"
                >
                  清空
                </button>
              </div>
              <div className="space-y-1.5">
                {recentRooms.map((item) => (
                  <div
                    key={item.roomId}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100/40 hover:bg-pawn-cream/30 transition text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-pawn-rose">
                        <TagIcon />
                      </span>
                      <div>
                        <span className="font-bold text-pawn-dark tracking-wider">
                          {item.roomId}
                        </span>
                        <span className="text-[9px] text-stone-400">
                          ({item.playerName})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px] text-stone-400">
                        {new Date(item.joinedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleFastRejoin(item)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-[10px] text-pawn-clay font-bold rounded-lg transition active:scale-95"
                      >
                        快捷归位
                      </button>
                      <button
                        onClick={(e) => handleRemove(item.roomId, e)}
                        className="px-2 py-1 text-stone-400 hover:text-pawn-rose"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="bg-pawn-cream/40 border border-stone-200/50 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-pawn-dark flex items-center gap-1.5">
              <CompassIcon />
              游戏规则介绍
            </h3>
            <ul className="space-y-2.5 text-stone-600">
              <li className="flex gap-2">
                <span className="text-pawn-rose flex-shrink-0">🌸</span>
                <span>
                  <strong>初始底牌</strong>：从18张人生珍宝中，每人挑选10张作为你的初始底牌。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-pawn-rose flex-shrink-0">⚡</span>
                <span>
                  <strong>遭遇挫折</strong>：童年 → 少年 → 青年 → 中年 → 暮年，每个阶段随机触发一则生活挫折事件。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-pawn-rose flex-shrink-0">🍂</span>
                <span>
                  <strong>抉择代价</strong>：你可以选择<strong>「接受」</strong>它保留所有底牌，也可以忍痛<strong>「典当」</strong>任意2张底牌向命运妥协。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-pawn-rose flex-shrink-0">🔮</span>
                <span>
                  <strong>命运评判</strong>：五段人生走完后，查看属于你的人生档案与治愈系评判。
                </span>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

// Inline SVG icons
function StoreIcon() {
  return (
    <svg className="w-5 h-5 text-pawn-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-40 h-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

function LoginIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-pawn-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
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
