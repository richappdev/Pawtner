// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackEventMock } = vi.hoisted(() => ({ trackEventMock: vi.fn() }));
vi.mock("@/lib/firebase/observability", () => ({ trackEvent: trackEventMock }));

import {
  PetListAnalytics,
  PetViewAnalytics,
  TrackedLeadAnchor,
  TrackedLeadLink,
} from "@/components/adoption-analytics";

const pet = {
  species: "dog",
  sourceType: "government",
  status: "available",
  regionPresent: true,
};

describe("adoption analytics boundaries", () => {
  beforeEach(() => trackEventMock.mockReset());
  afterEach(cleanup);

  it("records list and privacy-safe filter results without the query value", async () => {
    render(
      <PetListAnalytics
        listId="explore_results"
        resultCount={0}
        filters={{ query: true, species: false, region: true, source: false }}
      />,
    );
    await waitFor(() => expect(trackEventMock).toHaveBeenCalledTimes(2));
    expect(trackEventMock).toHaveBeenCalledWith("filter_results", {
      has_query: true,
      has_species: false,
      has_region: true,
      has_source: false,
      result_count: 0,
    });
  });

  it("records a detail view using only safe pet dimensions", async () => {
    render(<PetViewAnalytics pet={pet} />);
    await waitFor(() => expect(trackEventMock).toHaveBeenCalledWith("view_item", {
      species: "dog",
      source_type: "government",
      status: "available",
      region_present: true,
    }));
  });

  it("records Pawtner and shelter leads at click boundaries", () => {
    render(
      <>
        <TrackedLeadLink href="/login" pet={pet} leadType="pawtner_application" onClick={(event) => event.preventDefault()}>Apply</TrackedLeadLink>
        <TrackedLeadAnchor href="https://example.test" pet={pet} leadType="shelter_contact" onClick={(event) => event.preventDefault()}>Contact</TrackedLeadAnchor>
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Apply" }));
    fireEvent.click(screen.getByRole("link", { name: "Contact" }));
    expect(trackEventMock).toHaveBeenCalledWith("generate_lead", expect.objectContaining({
      lead_type: "pawtner_application",
    }));
    expect(trackEventMock).toHaveBeenCalledWith("generate_lead", expect.objectContaining({
      lead_type: "shelter_contact",
    }));
  });
});
