import type { ReactNode } from "react";
import {
  DiscordFill,
  GithubFill,
  World2Line,
  TelegramFill,
} from "@mingcute/react";
import { useTranslation } from "@/languages";

interface AboutLink {
  id: string;
  url: string;
  label: string;
  icon: ReactNode;
}

const openUrl = (url: string) =>
  window.open(url, "_blank", "noopener,noreferrer");

export function AboutTabLinks() {
  return null;
}
