import { describe, expect, it } from "vitest";

import { pageMetadata } from "./seo";

describe("localized page metadata", () => {
  it("prefixes canonical and alternate URLs and selects the Open Graph locale", () => {
    const metadata = pageMetadata({
      locale: "en",
      title: "Explore pets",
      description: "Find a pet.",
      path: "/explore",
    });

    expect(metadata.alternates).toEqual({
      canonical: "/en/explore",
      languages: {
        "zh-TW": "/zh-TW/explore",
        en: "/en/explore",
      },
    });
    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      url: "https://pawtner-tw.web.app/en/explore",
    });
  });
});
