import { buildExpertReviewPrompt } from "@/lib/prompts/expert-review";
import { jsonError, runPrompt, stringField } from "@/lib/proposal-helper-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = {
    draft: stringField(body.draft)
  };

  if (!input.draft) {
    return jsonError("请先粘贴申报书草稿，再进行模拟专家预审。");
  }

  const prompt = buildExpertReviewPrompt(input);
  return runPrompt(prompt.system, prompt.user);
}
