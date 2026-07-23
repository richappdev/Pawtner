export type PublicPet<T extends object> = Omit<T, "private_address" | "privateAddress">;

export function sanitizePetForPublic<T extends object>(pet: T): PublicPet<T> {
  const clone = { ...(pet as Record<string, unknown>) };
  delete clone.private_address;
  delete clone.privateAddress;
  return clone as PublicPet<T>;
}
