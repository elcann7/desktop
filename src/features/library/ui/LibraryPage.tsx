import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LibraryControls from "./LibraryControls";
import LibraryGrid, { LibraryGridSkeleton } from "./LibraryGrid";
import LibraryTabs from "./LibraryTabs";
import type {
  LibraryItemViewModel,
  LibraryTab,
  LibraryViewMode,
} from "../types";
import {
  usePlaylistsList,
  useExternalItems,
  useLikedTrackCount,
  useYoutubeLibraryItems,
} from "../hooks";
import { useLikesCover } from "../hooks/useLikesCover";
import { useTranslation } from "@/languages";
import { useModalStore } from "../store/modalStore";
import { useImportStore } from "../store/importStore";
import { usePageBackdrop } from "@/shared/lib";
import ImportingPlaylistCard from "./ImportingPlaylistCard";
import { LocalFilesCard } from "../local";
import { useAuthStore } from "@/features/auth";
import { Download2Line } from "@mingcute/react";
import { useDownloadStore } from "@/features/player/store/downloadStore";
import DownloadedTracksView from "./DownloadedTracksView";

const PAGE_SIZE = 24;

interface TabState {
  query: string;
  visibleCount: number;
  loadingMore: boolean;
}

type LibraryState = Record<LibraryTab, TabState>;

const initialTabState: TabState = {
  query: "",
  visibleCount: PAGE_SIZE,
  loadingMore: false,
};

const initialState: LibraryState = {
  all: { ...initialTabState },
  playlists: { ...initialTabState },
  albums: { ...initialTabState },
  artists: { ...initialTabState },
  downloaded: { ...initialTabState },
};

function sortByRecent(items: LibraryItemViewModel[]) {
  const sorted = [...items];
  sorted.sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );
  return sorted;
}

function LikesPlaylistCard({
  count,
  isLoading,
  onClick,
  viewMode = "grid",
}: {
  count?: number;
  isLoading?: boolean;
  onClick: () => void;
  viewMode?: LibraryViewMode;
}) {
  const { t } = useTranslation();
  const likesCover = useLikesCover();

  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        className="w-full flex items-center justify-between rounded-md p-[8px] outline-none transition-colors duration-150 ease-out cursor-pointer hover:bg-border-alpha-14 select-none"
      >
        <div className="flex items-center gap-[16px] min-w-0">
          <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-md">
            <img
              src={likesCover}
              alt=""
              draggable={false}
              className="h-full w-full object-cover select-none"
            />
          </div>

          <div className="min-w-0 flex flex-col gap-[2px]">
            <h3
              className="m-0 max-w-[min(52vw,560px)] overflow-hidden text-ellipsis whitespace-nowrap text-[16px] leading-[1.2] text-text-primary"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 400,
              }}
            >
              {t("library.liked_songs")}
            </h3>
            <p
              className="m-0 flex min-w-0 items-center text-[15px] leading-[1.2] overflow-hidden text-text-secondary"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 350,
              }}
            >
              {isLoading || count === undefined ? (
                <span className="h-[12px] w-[60px] animate-pulse rounded bg-border-alpha-14" />
              ) : (
                t("common.songs", { count })
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-[8px] cursor-pointer"
      draggable={false}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md">
        <img
          src={likesCover}
          alt=""
          draggable={false}
          className="h-full w-full object-cover select-none"
        />
      </div>
      <div className="flex flex-col gap-[4px]">
        <span className="truncate text-[14px] font-[500] text-text-primary">
          {t("library.liked_songs")}
        </span>
        {isLoading || count === undefined ? (
          <div className="h-[13px] w-[56%] animate-pulse rounded bg-border-alpha-14" />
        ) : (
          <span className="truncate text-[13px] text-text-tertiary">
            {t("common.songs", { count })}
          </span>
        )}
      </div>
    </div>
  );
}

function DownloadedMusicCard({
  count,
  onClick,
  viewMode = "grid",
}: {
  count: number;
  onClick: () => void;
  viewMode?: LibraryViewMode;
}) {
  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        className="w-full flex items-center justify-between rounded-md p-[8px] outline-none transition-colors duration-150 ease-out cursor-pointer hover:bg-border-alpha-14 select-none"
      >
        <div className="flex items-center gap-[16px] min-w-0">
          <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center text-white shadow-md">
            <Download2Line size={24} />
          </div>

          <div className="min-w-0 flex flex-col gap-[2px]">
            <h3
              className="m-0 max-w-[min(52vw,560px)] overflow-hidden text-ellipsis whitespace-nowrap text-[16px] leading-[1.2] text-text-primary"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 400,
              }}
            >
              Yüklənmiş Mahnılar
            </h3>
            <p
              className="m-0 flex min-w-0 items-center text-[13px] leading-[1.2] overflow-hidden text-emerald-400 font-medium"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              {count} mahnı · Offline
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-[8px] cursor-pointer"
      draggable={false}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center text-white shadow-md group-hover:scale-[1.02] transition-transform">
        <Download2Line size={36} />
      </div>
      <div className="flex flex-col gap-[4px]">
        <span className="truncate text-[14px] font-[500] text-text-primary">
          Yüklənmiş Mahnılar
        </span>
        <span className="truncate text-[13px] text-emerald-400 font-medium">
          {count} mahnı · Offline
        </span>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const likesCover = useLikesCover();
  usePageBackdrop(likesCover, { blur: 56, dim: 0.22 });
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [stateByTab, setStateByTab] = useState<LibraryState>(initialState);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const user = useAuthStore((s) => s.user);
  const downloadedTrackIds = useDownloadStore((s) => s.downloadedTrackIds);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setActiveTab("downloaded");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liner_library_view_mode");
      if (saved === "grid" || saved === "list") {
        return saved;
      }
    }
    return "grid";
  });

  const handleViewModeChange = useCallback((newMode: LibraryViewMode) => {
    setViewMode(newMode);
    localStorage.setItem("liner_library_view_mode", newMode);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const activeState = stateByTab[activeTab];
  const hasSearchQuery = activeState.query.trim().length > 0;

  const {
    data: playlistsData,
    error: playlistsError,
    isLoading: playlistsLoading,
  } = usePlaylistsList();

  const { data: albumItems = [], isLoading: albumsLoading } =
    useExternalItems("album");
  const { data: artistItems = [], isLoading: artistsLoading } =
    useExternalItems("artist");
  const {
    data: externalPlaylistItems = [],
    isLoading: externalPlaylistsLoading,
  } = useExternalItems("playlist");
  const youtubeItems = useYoutubeLibraryItems();
  const youtubePlaylistItems = useMemo(
    () => youtubeItems.filter((item) => item.kind === "playlist"),
    [youtubeItems],
  );
  const youtubeAlbumItems = useMemo(
    () => youtubeItems.filter((item) => item.kind === "album"),
    [youtubeItems],
  );
  const { data: likedCount, isLoading: likedCountLoading } =
    useLikedTrackCount();
  const openCreatePlaylist = useModalStore((state) => state.openCreatePlaylist);

  const playlistItems: LibraryItemViewModel[] = useMemo(() => {
    if (!playlistsData) return [];
    const list = playlistsData.playlists ?? [];
    return list.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      subtitle: t("common.tracks", { count: playlist.trackCount }),
      imageUrl: playlist.coverUrl || "",
      coverUrls: playlist.coverUrls,
      kind: "playlist" as const,
      isOwned: true,
      href: `/library/playlist?id=${encodeURIComponent(playlist.id)}`,
      addedAt:
        playlist.updatedAt || playlist.createdAt || new Date().toISOString(),
    }));
  }, [playlistsData, t]);

  const initialLoading =
    playlistsLoading ||
    albumsLoading ||
    artistsLoading ||
    externalPlaylistsLoading;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as LibraryTab | null;
    if (tab && ["all", "playlists", "albums", "artists", "downloaded"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const filteredItems = useMemo(() => {
    let source: LibraryItemViewModel[];
    if (activeTab === "all") {
      source = [
        ...playlistItems,
        ...externalPlaylistItems,
        ...youtubePlaylistItems,
        ...albumItems,
        ...youtubeAlbumItems,
        ...artistItems,
      ];
    } else if (activeTab === "playlists") {
      source = [
        ...playlistItems,
        ...externalPlaylistItems,
        ...youtubePlaylistItems,
      ];
    } else if (activeTab === "albums") {
      source = [...albumItems, ...youtubeAlbumItems];
    } else if (activeTab === "artists") {
      source = artistItems;
    } else {
      return [];
    }
    const filtered =
      debouncedQuery.length === 0
        ? source
        : source.filter((item) => {
            const haystack = `${item.title} ${item.subtitle}`.toLowerCase();
            return haystack.includes(debouncedQuery);
          });

    return sortByRecent(filtered);
  }, [
    activeTab,
    debouncedQuery,
    playlistItems,
    externalPlaylistItems,
    youtubePlaylistItems,
    albumItems,
    youtubeAlbumItems,
    artistItems,
  ]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, activeState.visibleCount),
    [activeState.visibleCount, filteredItems],
  );

  const hasMore = activeState.visibleCount < filteredItems.length;

  const setActiveTabState = useCallback(
    (update: Partial<TabState>) => {
      setStateByTab((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], ...update },
      }));
    },
    [activeTab],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || activeState.loadingMore) {
      return;
    }

    setActiveTabState({ loadingMore: true });
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setStateByTab((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          visibleCount: Math.min(
            prev[activeTab].visibleCount + PAGE_SIZE,
            filteredItems.length,
          ),
          loadingMore: false,
        },
      }));
    }, 190);
  }, [
    activeState.loadingMore,
    activeTab,
    filteredItems.length,
    hasMore,
    setActiveTabState,
  ]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore || activeState.loadingMore) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        { rootMargin: "900px 0px" },
      );
      observerRef.current.observe(node);
    },
    [activeState.loadingMore, hasMore, loadMore],
  );

  useEffect(() => {
    const normalized = activeState.query.trim().toLowerCase();
    const timer = window.setTimeout(
      () => {
        setDebouncedQuery(normalized.length === 0 ? "" : normalized);
      },
      normalized.length === 0 ? 0 : 220,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeState.query]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const importJob = useImportStore((state) => state.job);
  const showsPlaylists = activeTab === "playlists" || activeTab === "all";
  const isImporting =
    Boolean(importJob) &&
    (importJob?.status === "queued" ||
      importJob?.status === "running" ||
      importJob?.status === "finalizing" ||
      importJob?.status === "awaiting_decision");

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-y-auto bg-transparent pb-(--page-inset-bottom)"
      >
        <div className="relative z-20 bg-transparent">
          <div className="px-[12px] pt-[36px] pb-[10px]">
            <h1
              className="text-[26px] font-bold text-text-primary tracking-tight m-0 leading-tight"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {t("library.title")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-[10px] px-[12px] pb-[10px]">
            <LibraryTabs activeTab={activeTab} onChange={setActiveTab} />
            <LibraryControls
              activeTab={activeTab}
              query={activeState.query}
              onQueryChange={(query) =>
                setActiveTabState({
                  query,
                  visibleCount: PAGE_SIZE,
                  loadingMore: false,
                })
              }
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onCreatePlaylist={
                showsPlaylists ? () => openCreatePlaylist() : undefined
              }
            />
          </div>
        </div>

        <div className="px-[12px] pt-[4px] pb-[20px]">
          {!user && (
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-accent-primary/20 via-accent-secondary/15 to-transparent border border-white/10 flex items-center justify-between gap-3 shadow-md">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-text-primary">Daxil olmamısınız</h3>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  Öz pleylistlərinizi və bəyəndiyiniz mahnıları görmək üçün daxil olun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="shrink-0 px-4 py-1.5 rounded-full bg-white text-black font-semibold text-[13px] hover:bg-white/90 active:scale-95 transition-transform cursor-pointer"
              >
                Daxil ol
              </button>
            </div>
          )}

          {isOffline && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-amber-200 text-[13px]">
              <span>⚡ İnternet bağlantısı yoxdur — Yalnız yüklənmiş offline mahnılar göstərilir.</span>
            </div>
          )}

          {activeTab === "downloaded" ? (
            <DownloadedTracksView searchQuery={activeState.query} />
          ) : activeTab === "playlists" && playlistsError ? (
            <div className="mb-[10px] text-[12px] text-accent-secondary">
              {t("playlist.error_loading")}
            </div>
          ) : initialLoading ? (
            <LibraryGridSkeleton viewMode={viewMode} />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeTab}:${debouncedQuery || "all"}:${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <LibraryGrid
                  items={visibleItems}
                  loadingMore={activeState.loadingMore}
                  hasMore={hasMore}
                  hasSearchQuery={hasSearchQuery}
                  activeTab={activeTab}
                  viewMode={viewMode}
                  sentinelRef={sentinelRef}
                  prependNodes={
                    showsPlaylists && !hasSearchQuery
                      ? [
                          <LikesPlaylistCard
                            key="likes-playlist-card"
                            count={likedCount}
                            isLoading={likedCountLoading}
                            viewMode={viewMode}
                            onClick={() =>
                              navigate("/library/playlist?id=likes")
                            }
                          />,
                          <DownloadedMusicCard
                            key="downloaded-music-card"
                            count={downloadedTrackIds.size}
                            viewMode={viewMode}
                            onClick={() => setActiveTab("downloaded")}
                          />,
                          <LocalFilesCard
                            key="local-files-card"
                            viewMode={viewMode}
                          />,
                          ...(isImporting && importJob
                            ? [
                                <ImportingPlaylistCard
                                  key={`importing-playlist-${importJob.id}`}
                                  job={importJob}
                                  viewMode={viewMode}
                                />,
                              ]
                            : []),
                        ]
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
