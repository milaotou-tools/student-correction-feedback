import { buildReviewDraftPrompt } from "@/lib/prompts/review-draft";
import { jsonError, runPrompt, stringField } from "@/lib/proposal-helper-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = {
    draft: stringField(body.draft),
    scope: stringField(body.scope) || "整体诊断"
  };

  if (!input.draft) {
    return jsonError("请先粘贴申报书草稿。");
  }

  const prompt = buildReviewDraftPrompt(input);
  return runPrompt(prompt.system, prompt.user);
}
