"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { trackEvent } from "@/lib/firebase/observability";

export interface SafePetDimensions {
  species: string;
  sourceType: string;
  status: string;
  regionPresent: boolean;
}

function eventDimensions(pet: SafePetDimensions) {
  return {
    species: pet.species,
    source_type: pet.sourceType,
    status: pet.status,
    region_present: pet.regionPresent,
  };
}

export function PetListAnalytics({
  listId,
  resultCount,
  filters,
}: {
  listId: "home_featured" | "explore_results";
  resultCount: number;
  filters?: { query: boolean; species: boolean; region: boolean; source: boolean };
}) {
  useEffect(() => {
    void trackEvent("view_item_list", { item_list_id: listId, result_count: resultCount });
    if (filters && Object.values(filters).some(Boolean)) {
      void trackEvent("filter_results", {
        has_query: filters.query,
        has_species: filters.species,
        has_region: filters.region,
        has_source: filters.source,
        result_count: resultCount,
      });
    }
  }, [filters, listId, resultCount]);
  return null;
}

export function PetViewAnalytics({ pet }: { pet: SafePetDimensions }) {
  useEffect(() => {
    void trackEvent("view_item", eventDimensions(pet));
  }, [pet]);
  return null;
}

export function TrackedLeadLink({
  pet,
  leadType,
  children,
  className,
  variant = "primary",
  size = "lg",
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  pet: SafePetDimensions;
  leadType: "pawtner_application" | "shelter_contact";
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      {...props}
      className={buttonClasses({ variant, size, className })}
      onClick={(event) => {
        onClick?.(event);
        void trackEvent("generate_lead", {
          ...eventDimensions(pet),
          lead_type: leadType,
        });
      }}
    >
      {children}
    </Link>
  );
}

export function TrackedLeadAnchor({
  pet,
  leadType,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  pet: SafePetDimensions;
  leadType: "pawtner_application" | "shelter_contact";
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        void trackEvent("generate_lead", { ...eventDimensions(pet), lead_type: leadType });
      }}
    >
      {children}
    </a>
  );
}
