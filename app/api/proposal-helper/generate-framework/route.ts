import { buildGenerateFrameworkPrompt } from "@/lib/prompts/generate-framework";
import { jsonError, runPrompt, stringField } from "@/lib/proposal-helper-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = {
    stageSubject: stringField(body.stageSubject),
    idea: stringField(body.idea),
    problem: stringField(body.problem),
    researchObjects: stringField(body.researchObjects),
    practiceBase: stringField(body.practiceBase),
    expectedOutputs: stringField(body.expectedOutputs)
  };

  if (!input.idea || !input.problem) {
    return jsonError("请至少填写初步课题想法和当前遇到的教育教学问题。");
  }

  const prompt = buildGenerateFrameworkPrompt(input);
  return runPrompt(prompt.system, prompt.user);
}
