import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveDonationDestination {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website_url: string | null;
  };
  authorization: {
    project_name: string;
    permit_number: string;
    valid_from: string;
    valid_to: string;
    lookup_url: string;
    donation_page_url: string;
  };
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function getActiveDonationDestination(
  supabase: SupabaseClient,
  slug: string,
  now = new Date(),
): Promise<{ data: ActiveDonationDestination | null; error: { message: string } | null }> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,slug,description,website_url")
    .eq("slug", slug)
    .eq("is_verified", true)
    .maybeSingle();

  if (organizationError) return { data: null, error: organizationError };
  if (!organization) return { data: null, error: null };

  const today = now.toISOString().slice(0, 10);
  const { data: authorization, error: authorizationError } = await supabase
    .from("fundraising_authorizations")
    .select("project_name,permit_number,valid_from,valid_to,lookup_url,donation_page_url")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .lte("valid_from", today)
    .gte("valid_to", today)
    .order("valid_to", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (authorizationError) return { data: null, error: authorizationError };
  if (!authorization) return { data: null, error: null };

  const lookupUrl = safeExternalUrl(authorization.lookup_url);
  const donationPageUrl = safeExternalUrl(authorization.donation_page_url);
  if (!lookupUrl || !donationPageUrl) return { data: null, error: null };

  return {
    data: {
      organization,
      authorization: {
        ...authorization,
        lookup_url: lookupUrl,
        donation_page_url: donationPageUrl,
      },
    },
    error: null,
  };
}
