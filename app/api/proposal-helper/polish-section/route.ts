import { buildPolishSectionPrompt } from "@/lib/prompts/polish-section";
import { jsonError, runPrompt, stringField } from "@/lib/proposal-helper-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = {
    draft: stringField(body.draft),
    section: stringField(body.section) || "整体"
  };

  if (!input.draft) {
    return jsonError("请先粘贴需要打磨的申报书内容。");
  }

  const prompt = buildPolishSectionPrompt(input);
  return runPrompt(prompt.system, prompt.user);
}
