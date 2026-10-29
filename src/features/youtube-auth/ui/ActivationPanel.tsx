import type { TvDeviceCode } from "@/shared/youtube";
import { useTranslation } from "@/languages";
import ActivationCode from "./ActivationCode";
import QrTile from "./QrTile";

const ACTIVATE_URL = "https://yt.be/activate";
const ACTIVATE_LABEL = "yt.be/activate";

export interface ActivationPanelProps {
  code: TvDeviceCode | null;
}

function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ActivationPanel({ code }: ActivationPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center w-full md:w-[170px] shrink-0 pt-2 md:pt-0">
      <QrTile value={code?.activationUrl ?? null} />
      <div className="mt-[12px] flex flex-col items-center gap-[6px]">
        <span className="text-[12px] leading-none text-text-tertiary">
          {t("youtube_auth.or_enter_code") || "və ya linkə daxil olun:"}
        </span>
        <a
          href={code?.activationUrl || ACTIVATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13.5px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-[3px]"
        >
          {ACTIVATE_LABEL}
        </a>
      </div>
      <div className="mt-[12px] w-full max-w-[200px]">
        <ActivationCode code={code?.userCode ?? null} />
      </div>
    </div>
  );
}
