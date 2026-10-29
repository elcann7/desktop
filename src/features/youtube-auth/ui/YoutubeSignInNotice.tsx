import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/languages";
import { cn } from "@/shared/lib";
import { useYoutubeSignInStore } from "../store/youtubeSignInStore";
import { useYoutubeSignInPrompt } from "../hooks/useYoutubeSignInPrompt";
import ActivationPanel from "./ActivationPanel";
import TrackBadge from "./TrackBadge";
import LogoPattern from "./LogoPattern";

const buttonBase =
  "h-[40px] shrink-0 rounded-[12px] px-[18px] text-[14.5px] font-[500] transition-colors";

export default function YoutubeSignInNotice() {
  useYoutubeSignInPrompt();
  const { t } = useTranslation();
  const open = useYoutubeSignInStore((state) => state.open);
  const phase = useYoutubeSignInStore((state) => state.phase);
  const code = useYoutubeSignInStore((state) => state.code);
  const dismiss = useYoutubeSignInStore((state) => state.dismiss);
  const retry = useYoutubeSignInStore((state) => state.retry);
  const failed = phase === "error";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-[9997] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-live="polite"
            data-no-window-drag
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-y-1/2 z-[9998] -translate-x-1/2",
              "flex w-[560px] max-w-[calc(100vw-28px)] flex-col md:flex-row items-center md:items-stretch gap-[16px] md:gap-[20px] overflow-y-auto max-h-[90vh] p-[20px]",
              "rounded-[28px] bg-bg-surface/98 dark:bg-[#16161a]/98 shadow-[0_24px_80px_rgba(0,0,0,0.7)] border border-white/10",
              "backdrop-blur-[48px]",
            )}
          >
          <LogoPattern />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <TrackBadge />
            <h2 className="mt-[14px] text-[18px] font-[600] leading-[1.25] tracking-[-0.01em] text-text-primary">
              {t("youtube_auth.title") ||
                "YouTube ilə Giriş Edin"}
            </h2>
            <p className="mt-[8px] text-[13.5px] leading-[1.45] text-text-secondary">
              {t("youtube_auth.description") ||
                "YouTube Music mahnı axını üçün 1 dəfə hesab təsdiqi tələb edir (BotGuard). Aşağıdakı kodla daxil olduqda bütün məhdudiyyətlər qalxır və mahnılar problemsiz oxunur."}
            </p>
            <div className="mt-[16px] flex flex-wrap gap-[8px]">
              <button
                type="button"
                disabled={!failed}
                onClick={failed ? retry : undefined}
                className={cn(
                  buttonBase,
                  "bg-text-primary/75 text-bg-primary/80",
                  failed ? "hover:bg-text-primary/90" : "cursor-default",
                )}
              >
                {failed
                  ? t("youtube_auth.retry") || "Yenidən yoxla"
                  : t("youtube_auth.waiting") || "Giriş gözlənilir…"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  buttonBase,
                  "bg-black/[0.06] text-text-primary hover:bg-black/[0.1]",
                  "dark:bg-white/[0.1] dark:hover:bg-white/[0.15]",
                )}
              >
                {t("youtube_auth.not_now") || "İndi yox"}
              </button>
            </div>
          </div>
          <ActivationPanel code={code} />
        </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
