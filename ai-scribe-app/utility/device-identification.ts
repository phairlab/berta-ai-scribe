import { headers } from "next/headers";

export const isMobileDevice = async (): Promise<boolean> => {
  const readOnlyHeaders = await headers();
  const userAgent = readOnlyHeaders.get("user-agent") ?? "";

  return /android.+mobile|ip(hone|[oa]d)/i.test(userAgent);
};
