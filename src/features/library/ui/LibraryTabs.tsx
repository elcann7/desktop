import type { LibraryTab } from "../types";
import { useTranslation } from "@/languages";
import Button from "@/shared/ui/Button";
import { HERO_BUTTON_CLASS, HERO_GLASS_BUTTON_CLASS } from "@/shared/ui";

interface LibraryTabsProps {
  activeTab: LibraryTab;
  onChange: (tab: LibraryTab) => void;
}

const tabs: LibraryTab[] = ["all", "playlists", "albums", "artists", "downloaded"];

export default function LibraryTabs({ activeTab, onChange }: LibraryTabsProps) {
  const { t } = useTranslation();

  const rawDownloaded = t("library.tab_downloaded");
  const downloadedLabel =
    rawDownloaded && rawDownloaded !== "library.tab_downloaded"
      ? rawDownloaded
      : "Yüklənənlər";

  const tabLabels: Record<LibraryTab, string> = {
    all: t("library.tab_all"),
    playlists: t("library.tab_playlists"),
    albums: t("library.tab_albums"),
    artists: t("library.tab_artists"),
    downloaded: downloadedLabel,
  };

  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar py-0.5">
      <div className="flex items-center gap-[8px] w-max shrink-0" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab)}
              variant={isActive ? "primary" : "secondary"}
              className={`${HERO_BUTTON_CLASS} px-[16px] shrink-0 whitespace-nowrap ${
                isActive ? "" : `${HERO_GLASS_BUTTON_CLASS} text-text-primary`
              }`}
            >
              {tabLabels[tab]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
