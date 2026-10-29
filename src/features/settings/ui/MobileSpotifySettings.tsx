import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LeftLine,
  RightLine,
  CloseLine,
  CheckLine,
  DeleteLine,
} from "@mingcute/react";
import {
  Play,
  Palette,
  InfoCircle,
  Database,
  MusicNote,
  VolumeCross,
  Soundwave,
} from "@solar-icons/react";
import { UserAvatar, ToggleSwitch, showToast } from "@/shared/ui";
import { useAuthStore } from "@/features/auth";
import { userDisplayName } from "@/entities/user";
import { usePlayerStore, type AudioQuality, type AccentVariant } from "@/features/player";
import {
  getCachedStorageAnalytics,
  formatStorageBytes,
  clearStorageCategories,
  getAudioCacheLimitBytes,
  setAudioCacheLimitBytes,
  type StorageAnalytics,
} from "@/shared/utils/cacheManager";

type MobileSubpage =
  | "playback"
  | "audioQuality"
  | "storage"
  | "appearance"
  | "about"
  | "account";

interface MobileSpotifySettingsProps {
  onClose: () => void;
}

export function MobileSpotifySettings({ onClose }: MobileSpotifySettingsProps) {
  const [activeSubpage, setActiveSubpage] = useState<MobileSubpage | null>(null);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const displayName = userDisplayName(user) || "Elcan";
  const handle = user?.username ? `@${user.username}` : user?.email || "Free Account";

  // Player Store playback settings
  const crossfadeSeconds = usePlayerStore((s) => s.crossfadeSeconds ?? 4);
  const setCrossfadeSeconds = usePlayerStore((s) => s.setCrossfadeSeconds);
  const gaplessPlayback = usePlayerStore((s) => s.gaplessPlayback ?? true);
  const setGaplessPlayback = usePlayerStore((s) => s.setGaplessPlayback);
  const automix = usePlayerStore((s) => s.automix ?? true);
  const setAutomix = usePlayerStore((s) => s.setAutomix);
  const audioNormalization = usePlayerStore((s) => s.audioNormalization ?? true);
  const setAudioNormalization = usePlayerStore((s) => s.setAudioNormalization);
  const monoAudio = usePlayerStore((s) => s.monoAudio ?? false);
  const setMonoAudio = usePlayerStore((s) => s.setMonoAudio);
  const autoplaySimilar = usePlayerStore((s) => s.autoplaySimilar ?? true);
  const setAutoplaySimilar = usePlayerStore((s) => s.setAutoplaySimilar);
  const pauseOnDeviceChange = usePlayerStore((s) => s.pauseOnDeviceChange ?? true);
  const setPauseOnDeviceChange = usePlayerStore((s) => s.setPauseOnDeviceChange);
  const audioQuality = usePlayerStore((s) => s.audioQuality ?? "high");
  const setAudioQuality = usePlayerStore((s) => s.setAudioQuality);
  const accentVariant = usePlayerStore((s) => s.accentVariant ?? "default");
  const setAccentVariant = usePlayerStore((s) => s.setAccentVariant);
  const offlineMode = usePlayerStore((s) => s.offlineMode ?? false);
  const setOfflineMode = usePlayerStore((s) => s.setOfflineMode);

  // Storage analytics
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(() =>
    getCachedStorageAnalytics(),
  );
  const [cacheLimitGb, setCacheLimitGb] = useState<number>(() => {
    const bytes = getAudioCacheLimitBytes();
    return Math.round(bytes / (1024 * 1024 * 1024));
  });

  const refreshStorage = () => {
    setAnalytics(getCachedStorageAnalytics());
  };

  const handleClearCache = async () => {
    try {
      await clearStorageCategories(["audio"]);
      showToast("Cache successfully cleared", "checkmark");
      refreshStorage();
    } catch {
      showToast("Failed to clear cache", "info");
    }
  };

  const handleClearDownloads = async () => {
    try {
      await clearStorageCategories(["audio", "covers"]);
      showToast("All offline downloads removed", "checkmark");
      refreshStorage();
    } catch {
      showToast("Failed to remove downloads", "info");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] text-white overflow-hidden select-none">
      {/* Header Bar */}
      <header className="h-[52px] shrink-0 px-4 flex items-center justify-between border-b border-white/[0.08] bg-[#121212]/95 backdrop-blur-xl z-20">
        {activeSubpage ? (
          <button
            type="button"
            onClick={() => setActiveSubpage(null)}
            className="flex items-center gap-1.5 text-white/90 hover:text-white text-[15px] font-semibold bg-transparent border-0 p-0 cursor-pointer active:opacity-70 transition-opacity"
          >
            <LeftLine size={20} />
            <span>Settings</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-transparent border-0 p-1 cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
          >
            <CloseLine size={22} />
          </button>
        )}

        <h2 className="text-[16px] font-bold tracking-tight text-white m-0 capitalize">
          {activeSubpage ? (activeSubpage === "audioQuality" ? "Audio Quality" : activeSubpage) : "Settings"}
        </h2>

        <div className="w-[60px] flex justify-end">
          {activeSubpage && (
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white bg-transparent border-0 p-1 cursor-pointer flex items-center justify-center"
            >
              <CloseLine size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 space-y-4">
        <AnimatePresence mode="wait">
          {!activeSubpage && (
            <motion.div
              key="root-menu"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {/* User Account Card */}
              <div
                onClick={() => setActiveSubpage("account")}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] active:scale-[0.99] transition-all cursor-pointer border border-white/[0.06]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <UserAvatar user={user ?? null} size={48} />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#121212]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[16px] font-bold text-white truncate">
                      {displayName}
                    </span>
                    <span className="text-[13px] text-white/50 truncate flex items-center gap-1">
                      {handle} &bull; View Profile
                    </span>
                  </div>
                </div>
                <RightLine size={18} className="text-white/40 shrink-0" />
              </div>

              {/* Navigation List */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                {/* Playback */}
                <button
                  type="button"
                  onClick={() => setActiveSubpage("playback")}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Play size={20} className="text-emerald-400 shrink-0" weight="Bold" />
                    <div>
                      <div className="text-[15px] font-semibold text-white">Playback</div>
                      <div className="text-[12px] text-white/50">Crossfade, Gapless, Automix</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {crossfadeSeconds > 0 ? `${crossfadeSeconds}s mix` : "Gapless"}
                    </span>
                    <RightLine size={18} className="text-white/30 shrink-0" />
                  </div>
                </button>

                {/* Audio Quality */}
                <button
                  type="button"
                  onClick={() => setActiveSubpage("audioQuality")}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Soundwave size={20} className="text-blue-400 shrink-0" weight="Bold" />
                    <div>
                      <div className="text-[15px] font-semibold text-white">Audio Quality</div>
                      <div className="text-[12px] text-white/50">Streaming & Download format</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-white/60 capitalize">
                      {audioQuality}
                    </span>
                    <RightLine size={18} className="text-white/30 shrink-0" />
                  </div>
                </button>

                {/* Storage & Cache */}
                <button
                  type="button"
                  onClick={() => setActiveSubpage("storage")}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-amber-400 shrink-0" weight="Bold" />
                    <div>
                      <div className="text-[15px] font-semibold text-white">Storage & Cache</div>
                      <div className="text-[12px] text-white/50">Offline songs, cache clean</div>
                    </div>
                  </div>
                  <RightLine size={18} className="text-white/30 shrink-0" />
                </button>

                {/* Appearance */}
                <button
                  type="button"
                  onClick={() => setActiveSubpage("appearance")}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Palette size={20} className="text-purple-400 shrink-0" weight="Bold" />
                    <div>
                      <div className="text-[15px] font-semibold text-white">Appearance & Theme</div>
                      <div className="text-[12px] text-white/50">Accent colors, player styles</div>
                    </div>
                  </div>
                  <RightLine size={18} className="text-white/30 shrink-0" />
                </button>

                {/* About */}
                <button
                  type="button"
                  onClick={() => setActiveSubpage("about")}
                  className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <InfoCircle size={20} className="text-rose-400 shrink-0" weight="Bold" />
                    <div>
                      <div className="text-[15px] font-semibold text-white">About Project</div>
                      <div className="text-[12px] text-white/50">Version 1.0.0, personal fork</div>
                    </div>
                  </div>
                  <RightLine size={18} className="text-white/30 shrink-0" />
                </button>
              </div>

              {/* Log out / Switch Account Button */}
              <div className="pt-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="w-[200px] py-3 rounded-full bg-white text-black text-[14px] font-bold hover:bg-white/90 active:scale-95 transition-all border-0 cursor-pointer shadow-lg"
                >
                  Log out
                </button>
                <span className="text-[11px] text-white/40 mt-3">
                  App version 1.0.0 (iOS Release)
                </span>
              </div>
            </motion.div>
          )}

          {/* Subpage: Playback (Apple Music / Spotify Transitions) */}
          {activeSubpage === "playback" && (
            <motion.div
              key="playback-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {/* Offline mode */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-white">Offline Mode</div>
                  <div className="text-[12px] text-white/50 mt-0.5">
                    Only play downloaded tracks & playlists
                  </div>
                </div>
                <ToggleSwitch checked={offlineMode} onChange={setOfflineMode} />
              </div>

              {/* Crossfade Slider */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-white">Crossfade</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Smoothly blends from one track into the next
                    </div>
                  </div>
                  <span className="text-[14px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {crossfadeSeconds === 0 ? "Off" : `${crossfadeSeconds}s`}
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/40 mb-2">
                    <span>0s (Off)</span>
                    <span>6s</span>
                    <span>12s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={crossfadeSeconds}
                    onChange={(e) => setCrossfadeSeconds(Number(e.target.value))}
                    className="w-full h-2 rounded-lg accent-emerald-500 bg-white/10 cursor-pointer appearance-none"
                  />
                </div>
              </div>

              {/* Transitions & Audio Options */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] divide-y divide-white/[0.05]">
                {/* Gapless Playback */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Gapless Playback</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Eliminates silence between consecutive tracks
                    </div>
                  </div>
                  <ToggleSwitch checked={gaplessPlayback} onChange={setGaplessPlayback} />
                </div>

                {/* Automix */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Automix</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Allow seamless DJ transitions between songs on select playlists
                    </div>
                  </div>
                  <ToggleSwitch checked={automix} onChange={setAutomix} />
                </div>

                {/* Audio Normalization */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Enable Audio Normalization</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Sets consistent volume levels across all tracks
                    </div>
                  </div>
                  <ToggleSwitch checked={audioNormalization} onChange={setAudioNormalization} />
                </div>

                {/* Mono Audio */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Mono Audio</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Makes left and right speakers play the same audio
                    </div>
                  </div>
                  <ToggleSwitch checked={monoAudio} onChange={setMonoAudio} />
                </div>

                {/* Autoplay Similar */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Autoplay Similar</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Keep listening to recommendations when your playlist ends
                    </div>
                  </div>
                  <ToggleSwitch checked={autoplaySimilar} onChange={setAutoplaySimilar} />
                </div>

                {/* Pause on device change */}
                <div className="p-4 flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-[15px] font-semibold text-white">Pause on Device Change</div>
                    <div className="text-[12px] text-white/50 mt-0.5">
                      Pause playback when headphones or Bluetooth disconnect
                    </div>
                  </div>
                  <ToggleSwitch checked={pauseOnDeviceChange} onChange={setPauseOnDeviceChange} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Subpage: Audio Quality */}
          {activeSubpage === "audioQuality" && (
            <motion.div
              key="audio-quality-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="text-[15px] font-semibold text-white">Streaming Quality</div>
                <div className="text-[12px] text-white/50">Higher quality uses more cellular data</div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {(["low", "standard", "high", "lossless"] as AudioQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAudioQuality(q)}
                      className={`p-3 rounded-xl border text-[13px] font-semibold capitalize cursor-pointer transition-all ${
                        audioQuality === q
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                      }`}
                    >
                      {q === "lossless" ? "Lossless (Hi-Fi)" : q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="text-[15px] font-semibold text-white">Download Quality</div>
                <div className="text-[12px] text-white/50">Quality saved to offline device storage</div>

                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <span className="text-[14px] text-white font-medium">Standard High Quality (256 kbps)</span>
                  <CheckLine size={18} className="text-emerald-400" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Subpage: Storage */}
          {activeSubpage === "storage" && (
            <motion.div
              key="storage-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-4">
                <div className="text-[15px] font-semibold text-white">Device Storage</div>

                {/* Storage Bar */}
                <div className="h-4 w-full rounded-full bg-white/10 overflow-hidden flex">
                  <div
                    style={{ width: "35%" }}
                    className="h-full bg-emerald-500"
                    title="Downloads"
                  />
                  <div
                    style={{ width: "20%" }}
                    className="h-full bg-cyan-400"
                    title="Audio Cache"
                  />
                </div>

                <div className="flex items-center justify-between text-[12px] text-white/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Downloads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Cache
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" /> Free Space
                  </span>
                </div>
              </div>

              {/* Cache limit */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-white">Max Cache Size</div>
                  <span className="text-[14px] font-bold text-amber-400">{cacheLimitGb} GB</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={cacheLimitGb}
                  onChange={(e) => {
                    const gb = Number(e.target.value);
                    setCacheLimitGb(gb);
                    setAudioCacheLimitBytes(gb * 1024 * 1024 * 1024);
                  }}
                  className="w-full h-2 rounded-lg accent-amber-500 bg-white/10 cursor-pointer appearance-none"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="w-full py-3 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.99] text-white text-[14px] font-semibold border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <DeleteLine size={16} />
                  <span>Clear Temporary Cache</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearDownloads}
                  className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-[0.99] text-red-400 text-[14px] font-semibold border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <VolumeCross size={16} />
                  <span>Remove All Offline Downloads</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Subpage: Appearance */}
          {activeSubpage === "appearance" && (
            <motion.div
              key="appearance-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="text-[15px] font-semibold text-white">Accent Color</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: "default", name: "Classic Green", color: "#1DB954" },
                    { id: "spotify", name: "Spotify Green", color: "#1ed760" },
                    { id: "aurora", name: "Aurora Cyan", color: "#00f0ff" },
                    { id: "sunset", name: "Sunset Orange", color: "#ff5e3a" },
                    { id: "berry", name: "Berry Purple", color: "#b942f5" },
                    { id: "carbon", name: "OLED Minimal", color: "#ffffff" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setAccentVariant(v.id as AccentVariant)}
                      className={`p-3 rounded-xl border text-[13px] font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
                        accentVariant === v.id
                          ? "bg-white/[0.12] border-white text-white"
                          : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: v.color }}
                      />
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Subpage: Account */}
          {activeSubpage === "account" && (
            <motion.div
              key="account-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="text-[15px] font-semibold text-white">Profile Details</div>
                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between text-[14px]">
                    <span className="text-white/50">Display Name</span>
                    <span className="font-semibold text-white">{displayName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between text-[14px]">
                    <span className="text-white/50">Account Status</span>
                    <span className="font-semibold text-emerald-400">Personal Pro (Free)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between text-[14px]">
                    <span className="text-white/50">Storage</span>
                    <span className="font-semibold text-white">Unlimited IndexedDB</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Subpage: About */}
          {activeSubpage === "about" && (
            <motion.div
              key="about-subpage"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center shadow-xl">
                <MusicNote size={32} className="text-black" weight="Bold" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-white m-0">Personal Music App</h3>
                <p className="text-[13px] text-white/50 mt-1 m-0">Version 1.0.0 (Custom iOS Edition)</p>
              </div>
              <p className="text-[13px] text-white/70 leading-relaxed text-left m-0 p-3 rounded-xl bg-white/[0.03]">
                This is your personal open-source music player, built with Apple Music crossfade transitions, Spotify-inspired mobile architecture, high-fidelity offline downloads, and real-time synchronized lyrics.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default MobileSpotifySettings;
