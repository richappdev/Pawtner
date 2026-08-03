"use client";

import { Button } from "@/components/ui/button";
import { openConsentSettings } from "@/lib/firebase/consent";

export function PrivacySettingsButton() {
  return (
    <Button type="button" variant="secondary" onClick={openConsentSettings}>
      變更分析資料設定
    </Button>
  );
}
