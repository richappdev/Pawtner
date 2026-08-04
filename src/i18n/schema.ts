import { z } from "zod";

export const appLocaleSchema = z.enum(["zh-TW", "en"]);
