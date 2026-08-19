export type NormalizedSpecies = "dog" | "cat" | "other";
export type NormalizedSex = "male" | "female" | "unknown";
export type NormalizedAgeBand = "child" | "adult" | "senior" | "unknown";
export type NormalizedBodySize = "small" | "medium" | "large" | "unknown";
export type SourceQualityStatus = "clean" | "warning" | "blocked";
export type SourceIssueSeverity = "warning" | "blocker";

export type MoaRawRecord = Record<string, unknown>;

export interface SourceDataIssue {
  code: string;
  field: string;
  severity: SourceIssueSeverity;
  message: string;
}

export interface MappedMoaPet {
  externalId: string;
  externalSubId: string | null;
  name: string;
  species: NormalizedSpecies;
  breed: string | null;
  sex: NormalizedSex;
  ageMonths: number | null;
  ageBand: NormalizedAgeBand;
  bodySize: NormalizedBodySize;
  color: string | null;
  region: string | null;
  foundLocation: string | null;
  sterilized: boolean | null;
  vaccinated: boolean | null;
  rabiesVaccinated: boolean | null;
  shelterId: string | null;
  shelterName: string | null;
  shelterAddress: string | null;
  shelterPhone: string | null;
  officialUrl: string;
  adoptionOpenAt: string | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  imageUrl: string | null;
  publishEligible: boolean;
  availability: "open" | "future" | "unavailable";
  qualityStatus: SourceQualityStatus;
  issues: SourceDataIssue[];
  contentHash: string;
  rawPayload: MoaRawRecord;
}

const text = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const nullableBoolean = (value: unknown): boolean | null => {
  const normalized = text(value)?.toUpperCase();
  if (["T", "Y", "YES", "TRUE", "1", "是", "有"].includes(normalized ?? "")) return true;
  if (["F", "N", "NO", "FALSE", "0", "否", "無"].includes(normalized ?? "")) return false;
  return null;
};

const isoDate = (value: unknown): string | null => {
  const normalized = text(value);
  if (!normalized) return null;
  const date = new Date(normalized.replace(" ", "T"));
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

export function mapMoaSpecies(value: unknown): NormalizedSpecies {
  const normalized = text(value)?.toLowerCase();
  if (normalized === "狗" || normalized === "犬" || normalized === "dog") return "dog";
  if (normalized === "貓" || normalized === "猫" || normalized === "cat") return "cat";
  return "other";
}

export function mapMoaSex(value: unknown): NormalizedSex {
  const normalized = text(value)?.toUpperCase();
  if (normalized === "M" || normalized === "MALE" || normalized === "公") return "male";
  if (normalized === "F" || normalized === "FEMALE" || normalized === "母") return "female";
  return "unknown";
}

export function mapMoaAge(value: unknown): NormalizedAgeBand {
  const normalized = text(value)?.toUpperCase();
  if (normalized === "CHILD" || normalized === "幼年") return "child";
  if (normalized === "ADULT" || normalized === "成年") return "adult";
  if (normalized === "SENIOR" || normalized === "老年") return "senior";
  return "unknown";
}

export function mapMoaBodySize(value: unknown): NormalizedBodySize {
  const normalized = text(value)?.toUpperCase();
  if (normalized === "SMALL" || normalized === "小型") return "small";
  if (normalized === "MEDIUM" || normalized === "中型") return "medium";
  if (normalized === "BIG" || normalized === "LARGE" || normalized === "大型") return "large";
  return "unknown";
}

function fallbackName(species: NormalizedSpecies, subId: string | null, externalId: string): string {
  const kind = species === "dog" ? "犬" : species === "cat" ? "貓" : "動物";
  return `待認養${kind} · ${subId ?? externalId}`;
}

function inferRegion(address: string | null, place: string | null): string | null {
  const candidate = address ?? place;
  if (!candidate) return null;
  const match = candidate.match(/^(.{2,3}[縣市])/u);
  return match?.[1] ?? null;
}

const GOVERNMENT_ADOPTION_LIST_URL =
  "https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?PageType=Adopt";

const SHELTER_UNIT_TAGS: Readonly<Record<string, string>> = {
  "新北市政府動物保護防疫處": "AAAAG",
  "新北市新店區公立動物之家": "AAACG",
  "新北市板橋區公立動物之家": "AAADG",
  "新北市中和區公立動物之家": "AAAEG",
  "新北市淡水區公立動物之家": "AAAFG",
  "新北市瑞芳區公立動物之家": "AAAGG",
  "新北市五股區公立動物之家": "AAAHG",
  "新北市八里區公立動物之家": "AAAIG",
  "新北市三芝區公立動物之家": "AAAJG",
  "宜蘭縣流浪動物中途之家": "BAAAG",
  "桃園市動物保護教育園區": "CAAAG",
  "新竹縣動物保護教育園區": "DAAAG",
  "苗栗縣動物保護教育園區": "EAAAG",
  "臺中市動物之家南屯園區": "FAAAG",
  "臺中市動物之家后里園區": "FAABG",
  "彰化縣流浪狗中途之家臨時收容所": "GAAAG",
  "南投縣公立動物收容所": "HAAAG",
  "雲林縣流浪動物收容所": "IAAAG",
  "嘉義縣動物保護教育園區": "JAAAG",
  "高雄市壽山動物保護教育園區": "LAAAG",
  "高雄市燕巢動物保護關愛園區": "LAABG",
  "屏東縣公立犬貓中途之家": "MAAAG",
  "屏東縣動物之家": "MAABG",
  "臺東縣動物收容中心": "NAAAG",
  "花蓮縣狗貓躍動園區": "OAAAG",
  "澎湖縣流浪動物收容中心": "PAAAG",
  "基隆市寵物銀行": "QAAAG",
  "新竹市動物保護教育園區": "RAAAG",
  "嘉義市動物保護教育園區": "TAAAG",
  "臺南市動物之家灣裡站": "UAAAG",
  "臺南市動物之家善化站": "UAABG",
  "臺北市動物之家": "VAAAG",
  "連江縣動物之家": "XAAAG",
  "金門縣動物收容中心": "YAAAG",
};

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildMoaOfficialUrl(
  externalSubId: string | null,
  shelterName: string | null,
): string {
  if (!externalSubId) return GOVERNMENT_ADOPTION_LIST_URL;

  const unitTag = externalSubId.match(/^[A-Z]{4}G/u)?.[0]
    ?? (/^\d+$/u.test(externalSubId) && shelterName
      ? SHELTER_UNIT_TAGS[shelterName]
      : undefined);
  if (!unitTag) return GOVERNMENT_ADOPTION_LIST_URL;

  const url = new URL("https://www.pet.gov.tw/AnimalApp/AnnounceSingle.aspx");
  url.searchParams.set("PageType", "Adopt");
  url.searchParams.set("AcNum", base64(externalSubId));
  url.searchParams.set("UT", base64(unitTag));
  return url.toString();
}

function validGovernmentImage(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname === "www.pet.gov.tw"
      && parsed.pathname.startsWith("/upload/pic/")
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function mapMoaRecord(
  raw: MoaRawRecord,
  now = new Date(),
): Promise<MappedMoaPet | null> {
  const externalId = text(raw.animal_id);
  if (!externalId) return null;

  const species = mapMoaSpecies(raw.animal_kind);
  const externalSubId = text(raw.animal_subid);
  const sourceStatus = text(raw.animal_status)?.toUpperCase();
  const rawOpenDate = text(raw.animal_opendate);
  const adoptionOpenAt = isoDate(raw.animal_opendate);
  const isFuture = adoptionOpenAt ? new Date(adoptionOpenAt).valueOf() > now.valueOf() : false;
  const publishEligible = sourceStatus === "OPEN" && !isFuture;
  const availability = sourceStatus !== "OPEN" ? "unavailable" : isFuture ? "future" : "open";
  const shelterAddress = text(raw.shelter_address);
  const foundLocation = text(raw.animal_foundplace);
  const bacterin = nullableBoolean(raw.animal_bacterin);
  const shelterName = text(raw.shelter_name) ?? text(raw.animal_place);
  const shelterPhone = text(raw.shelter_tel);
  const imageUrl = validGovernmentImage(raw.album_file);
  const sex = mapMoaSex(raw.animal_sex);
  const ageBand = mapMoaAge(raw.animal_age);
  const bodySize = mapMoaBodySize(raw.animal_bodytype);
  const breed = text(raw.animal_Variety);
  const issues: SourceDataIssue[] = [];
  const issue = (
    code: string,
    field: string,
    severity: SourceIssueSeverity,
    message: string,
  ) => issues.push({ code, field, severity, message });

  if (!text(raw.animal_kind)) {
    issue("missing_species", "animal_kind", "blocker", "Official species is required.");
  }
  if (!shelterName) {
    issue("missing_shelter_name", "shelter_name", "blocker", "Official shelter name is required.");
  }
  if (!shelterPhone) {
    issue("missing_shelter_phone", "shelter_tel", "blocker", "Official shelter phone is required.");
  }
  if (!shelterAddress) {
    issue("missing_shelter_address", "shelter_address", "blocker", "Official shelter address is required.");
  }
  if (rawOpenDate && !adoptionOpenAt) {
    issue("invalid_adoption_open_date", "animal_opendate", "blocker", "Adoption-open date is invalid.");
  }
  if (!imageUrl) {
    issue("missing_or_invalid_image", "album_file", "warning", "The official feed does not provide an allowed image.");
  }
  if (sex === "unknown") {
    issue("unknown_sex", "animal_sex", "warning", "Sex could not be normalized.");
  }
  if (ageBand === "unknown") {
    issue("unknown_age", "animal_age", "warning", "Age band could not be normalized.");
  }
  if (bodySize === "unknown") {
    issue("unknown_body_size", "animal_bodytype", "warning", "Body size could not be normalized.");
  }
  if (!breed) {
    issue("missing_breed", "animal_Variety", "warning", "Breed is not provided.");
  }
  if (!foundLocation) {
    issue("missing_found_location", "animal_foundplace", "warning", "Found location is not provided.");
  }
  if (bacterin === null) {
    issue("unknown_rabies_vaccination", "animal_bacterin", "warning", "Rabies vaccination is unknown.");
  }
  const qualityStatus: SourceQualityStatus = issues.some((entry) => entry.severity === "blocker")
    ? "blocked"
    : issues.length > 0
      ? "warning"
      : "clean";
  const normalizedForHash = {
    externalId,
    externalSubId,
    species,
    breed,
    sex,
    ageBand,
    bodySize,
    color: text(raw.animal_colour),
    status: sourceStatus,
    sterilized: nullableBoolean(raw.animal_sterilization),
    bacterin,
    shelterId: text(raw.animal_shelter_pkid),
    shelterName,
    shelterAddress,
    shelterPhone,
    adoptionOpenAt,
    sourceCreatedAt: isoDate(raw.animal_createtime),
    sourceUpdatedAt: isoDate(raw.animal_update) ?? isoDate(raw.cDate),
    imageUrl,
  };

  return {
    externalId,
    externalSubId,
    name: text(raw.animal_title) ?? fallbackName(species, externalSubId, externalId),
    species,
    breed: normalizedForHash.breed,
    sex: normalizedForHash.sex,
    ageMonths: null,
    ageBand: normalizedForHash.ageBand,
    bodySize: normalizedForHash.bodySize,
    color: normalizedForHash.color,
    region: inferRegion(shelterAddress, text(raw.animal_place)),
    foundLocation,
    sterilized: normalizedForHash.sterilized,
    vaccinated: bacterin,
    rabiesVaccinated: bacterin,
    shelterId: normalizedForHash.shelterId,
    shelterName: normalizedForHash.shelterName,
    shelterAddress,
    shelterPhone: normalizedForHash.shelterPhone,
    officialUrl: buildMoaOfficialUrl(externalSubId, shelterName),
    adoptionOpenAt,
    sourceCreatedAt: normalizedForHash.sourceCreatedAt,
    sourceUpdatedAt: normalizedForHash.sourceUpdatedAt,
    imageUrl: normalizedForHash.imageUrl,
    publishEligible,
    availability,
    qualityStatus,
    issues,
    contentHash: await sha256(normalizedForHash),
    rawPayload: raw,
  };
}
