import { useState } from "react";
import { WarningFill } from "@mingcute/react";
import { useTranslation } from "@/languages";

const SKIP_KEY = "liner:env-warning-skipped";

// dev-friendly heads-up when the frontend runs in a plain browser instead of
// electron: deeplinks, offline diagnostics and signing need the desktop bridge.
export default function EnvironmentWarning() {
  return null;
}
