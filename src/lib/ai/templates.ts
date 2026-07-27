import type { AiContentKind } from "@/lib/ai/pipeline";

const PRIVATE_KEYS = new Set([
  "private_address",
  "email",
  "phone",
  "identity_document",
  "document_storage_path",
]);

function safeFacts(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => !PRIVATE_KEYS.has(key) && value != null),
  );
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function renderDeterministicDraft(
  kind: AiContentKind,
  input: Record<string, unknown>,
): { content: string; structuredFacts: Record<string, unknown>; model: string } {
  const facts = safeFacts(input);
  const name = text(facts.name ?? facts.petName, "這隻毛孩");
  const personality = text(facts.personalitySummary ?? facts.personality, "個性資訊待中途補充");
  const care = text(facts.specialCare, "請向中途確認照護需求");
  const conditions = text(facts.adoptionConditions, "領養條件請依中途審核為準");

  const content =
    kind === "application_summary"
      ? `申請摘要\n\n申請人條件：${text(facts.lifestyleSummary, "資料待確認")}\n配對重點：${text(facts.matchReason, "請人工檢視問卷與毛孩需求")}\n風險與待確認：${text(facts.risks, "無自動判定；請由中途人工審核")}`
      : kind === "support_reply"
        ? `您好，感謝關心 ${name}。目前可確認的資訊如下：${personality}。${care}。${conditions}。本訊息為系統草稿，請由中途確認後再傳送。`
        : kind === "pet_description"
          ? `${name}\n\n${personality}。\n\n照護提醒：${care}。\n領養條件：${conditions}。\n\n以上內容依現有結構化資料產生，發布前須由中途確認。`
          : `內容草稿\n\n${Object.entries(facts)
              .map(([key, value]) => `${key}：${String(value)}`)
              .join("\n")}\n\n發布前須人工確認。`;

  return { content, structuredFacts: facts, model: "pawtner-template-v1" };
}
