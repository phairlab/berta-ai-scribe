import { apiFetch } from "@/utility/network";

export async function POST(request: Request) {
  const requestData = await request.formData();

  return apiFetch("transcripts", {
    method: "POST",
    body: requestData,
  });
}
