"use client";

import { Button } from "@/components/ui/button";
import { openConsentSettings } from "@/lib/firebase/consent";
import { useTranslations } from "next-intl";

export function PrivacySettingsButton() {
  const t = useTranslations("Privacy");
  return (
    <Button type="button" variant="secondary" onClick={openConsentSettings}>
      {t("settings")}
    </Button>
  );
}
