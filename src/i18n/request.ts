import { getRequestConfig } from "next-intl/server";

import messages from "../../messages/zh-TW.json";

export default getRequestConfig(async () => ({
  locale: "zh-TW",
  messages,
  timeZone: "Asia/Taipei",
}));
