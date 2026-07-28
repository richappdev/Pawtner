import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PET_ATTRIBUTE_KEYS,
  PetAttributeIcon,
} from "@/components/pets/pet-attribute-icon";

describe("PetAttributeIcon", () => {
  it("renders every supported pet attribute as a decorative SVG", () => {
    const markup = renderToStaticMarkup(
      <div>
        {PET_ATTRIBUTE_KEYS.map((attribute) => (
          <PetAttributeIcon key={attribute} attribute={attribute} />
        ))}
      </div>,
    );

    expect(markup.match(/<svg/g)).toHaveLength(PET_ATTRIBUTE_KEYS.length);
    expect(markup.match(/<span aria-hidden="true"/g)).toHaveLength(PET_ATTRIBUTE_KEYS.length);
  });

  it("exposes visual tones without replacing the visible field label", () => {
    const markup = renderToStaticMarkup(
      <PetAttributeIcon attribute="vaccinated" tone="attention" />,
    );

    expect(markup).toContain("bg-[var(--pending-bg)]");
    expect(markup).toContain("text-[var(--pending-fg)]");
  });
});
