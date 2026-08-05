import { describe, expect, it } from "vitest";

import { pageMetadata } from "./seo";

describe("localized page metadata", () => {
  it("uses an unprefixed canonical URL and Traditional Chinese Open Graph locale", () => {
    const metadata = pageMetadata({
      title: "探索毛孩",
      description: "尋找適合的毛孩。",
      path: "/explore",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/explore",
    });
    expect(metadata.openGraph).toMatchObject({
      locale: "zh_TW",
      url: "https://pawtner-tw.web.app/explore",
    });
  });
});
