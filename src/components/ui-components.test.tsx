import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MatchExplanation } from "@/components/match-explanation";
import { EmptyState } from "@/components/page-shell";
import { PetCard } from "@/components/pet-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import type { PublicPetSummary } from "@/lib/pets/public-types";

describe("shared UI primitives", () => {
  it("renders typed button and badge variants with accessible content", () => {
    const markup = renderToStaticMarkup(
      <div>
        <Button variant="warm">支持照護</Button>
        <ButtonLink href="/explore" variant="secondary">探索毛孩</ButtonLink>
        <Badge variant="success" icon="✓">可申請</Badge>
      </div>,
    );
    expect(markup).toContain("支持照護");
    expect(markup).toContain('href="/explore"');
    expect(markup).toContain("可申請");
  });

  it("always gives actionable empty states a real destination", () => {
    const markup = renderToStaticMarkup(
      <EmptyState title="還沒有收藏" description="先去認識毛孩。" action={{ href: "/explore", label: "去探索" }} />,
    );
    expect(markup).toContain("還沒有收藏");
    expect(markup).toContain('href="/explore"');
  });

  it("renders match reasons and missing confirmations", () => {
    const markup = renderToStaticMarkup(
      <MatchExplanation
        result={{
          score: 82,
          eligible: true,
          reasons: ["作息接近", "可接受公寓生活"],
          risks: ["與幼童相處資料尚未完整"],
          questions: ["是否能安排每日散步？"],
          breakdown: {},
        }}
      />,
    );
    expect(markup).toContain("為什麼可能適合你");
    expect(markup).toContain("作息接近");
    expect(markup).toContain("還需要一起確認");
  });
});

describe("pet card", () => {
  it("keeps identity, facts, source, traits, and action in a stable order with a truthful fallback", () => {
    const pet: PublicPetSummary = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "名字很長但仍需要被完整看見的小朋友",
      species: "dog",
      breed: "米克斯",
      sex: "female",
      ageMonths: 29,
      ageBand: "adult",
      bodySize: "medium",
      region: "新北市",
      status: "available",
      sourceType: "private_foster",
      source: null,
      freshnessText: null,
      shelter: null,
      adoptionAction: { kind: "pawtner_application" },
      personalitySummary: "喜歡慢慢認識新朋友。",
      temperamentTags: ["穩定", "可討論公寓生活", "喜歡散步"],
      fosterDisplayName: "安心中途",
      organization: { name: "示範合作組織", slug: "demo", isVerified: true },
      coverMedia: null,
      profileCompleteness: 80,
      publishedAt: "2026-07-28T00:00:00Z",
    };
    const markup = renderToStaticMarkup(<PetCard pet={pet} />);
    const identity = markup.indexOf(pet.name);
    const facts = markup.indexOf("2 歲 5 個月");
    const source = markup.indexOf("示範合作組織");
    const traits = markup.indexOf("穩定");
    const action = markup.indexOf(`認識 ${pet.name}`);
    expect(markup).toContain("照片準備中");
    expect(identity).toBeLessThan(facts);
    expect(facts).toBeLessThan(source);
    expect(source).toBeLessThan(traits);
    expect(traits).toBeLessThan(action);
  });
});
