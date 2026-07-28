import { clsx } from "clsx";
import {
  BugOff,
  CalendarClock,
  CalendarDays,
  Cpu,
  createLucideIcon,
  HandHeart,
  Heart,
  MapPin,
  PawPrint,
  Scale,
  ShieldCheck,
  Syringe,
  VenusAndMars,
  type LucideIcon,
} from "lucide-react";

const BreedIcon = createLucideIcon("PawtnerBreed", [
  ["path", { d: "M3.5 7.5V4.5h9l7.5 7.5-7.5 7.5-9-9Z", key: "tag" }],
  ["circle", { cx: "7.5", cy: "8.5", r: "1", key: "tag-hole" }],
  ["path", { d: "m14.5 11 .8 1.2 1.4.3-.9 1.1.1 1.4-1.4-.5-1.2.8.1-1.4-1.1-.9 1.4-.3Z", key: "rosette" }],
]);

const CoatColorIcon = createLucideIcon("PawtnerCoatColor", [
  ["rect", { width: "8", height: "12", x: "3", y: "8", rx: "2", key: "swatch-left" }],
  ["rect", { width: "8", height: "15", x: "8", y: "5", rx: "2", key: "swatch-middle" }],
  ["rect", { width: "8", height: "18", x: "13", y: "2", rx: "2", key: "swatch-right" }],
  ["path", { d: "M7 16h.01M12 16h.01M17 16h.01", key: "swatch-dots" }],
]);

const AdoptionRequirementsIcon = createLucideIcon("PawtnerAdoptionRequirements", [
  ["path", { d: "M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3", key: "clipboard" }],
  ["rect", { width: "6", height: "4", x: "7", y: "3", rx: "1", key: "clip" }],
  ["path", { d: "m11 14 4-3 4 3v6h-8Z", key: "home" }],
  ["path", { d: "M14 20v-3h2v3", key: "door" }],
  ["path", { d: "m7 11 .8.8L9.5 10", key: "check" }],
]);

export const PET_ATTRIBUTE_KEYS = [
  "species",
  "breed",
  "sex",
  "region",
  "ageMonths",
  "weightKg",
  "color",
  "publishedAt",
  "sterilized",
  "microchipped",
  "vaccinated",
  "dewormed",
  "personality",
  "specialCare",
  "adoptionConditions",
] as const;

export type PetAttribute = (typeof PET_ATTRIBUTE_KEYS)[number];
export type PetAttributeIconTone = "default" | "positive" | "attention" | "unknown";

const ATTRIBUTE_ICONS: Record<PetAttribute, LucideIcon> = {
  species: PawPrint,
  breed: BreedIcon,
  sex: VenusAndMars,
  region: MapPin,
  ageMonths: CalendarDays,
  weightKg: Scale,
  color: CoatColorIcon,
  publishedAt: CalendarClock,
  sterilized: ShieldCheck,
  microchipped: Cpu,
  vaccinated: Syringe,
  dewormed: BugOff,
  personality: Heart,
  specialCare: HandHeart,
  adoptionConditions: AdoptionRequirementsIcon,
};

export function PetAttributeIcon({
  attribute,
  tone = "default",
  size = "md",
  className,
}: {
  attribute: PetAttribute;
  tone?: PetAttributeIconTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = ATTRIBUTE_ICONS[attribute];

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-xl border",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-12",
        tone === "default" && "border-transparent bg-surface-soft text-accent",
        tone === "positive" && "border-transparent bg-mint text-[var(--success-fg)]",
        tone === "attention" && "border-transparent bg-[var(--pending-bg)] text-[var(--pending-fg)]",
        tone === "unknown" && "border-line bg-surface text-muted",
        className,
      )}
    >
      <Icon
        className={clsx(
          size === "sm" && "size-4",
          size === "md" && "size-5",
          size === "lg" && "size-6",
        )}
        strokeWidth={2}
      />
    </span>
  );
}
