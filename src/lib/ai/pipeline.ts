import { checkAiContent, type AiSafetyResult } from "./safety";

export type AiContentKind = "pet_description" | "application_summary" | "support_reply" | "other";
export type AiReviewStatus = "needs_review";

export interface AiGeneratedContent {
  content: string;
  structuredFacts: unknown;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
}

export interface AiPipelineRequest<TInput> {
  kind: AiContentKind;
  input: TInput;
  generate: (request: { kind: AiContentKind; input: TInput }) => Promise<AiGeneratedContent>;
  factCheck?: (generated: AiGeneratedContent, input: TInput) => Promise<string[]>;
}

export interface AiPipelineResult {
  content: string;
  structuredFacts: unknown;
  safety: AiSafetyResult;
  factCheckFlags: string[];
  status: AiReviewStatus;
  cost: {
    model: string | null;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
  };
}

export async function runAiPipeline<TInput>(
  request: AiPipelineRequest<TInput>,
): Promise<AiPipelineResult> {
  const generated = await request.generate({ kind: request.kind, input: request.input });
  const safety = checkAiContent(generated.content, generated.structuredFacts);
  const factCheckFlags = request.factCheck
    ? await request.factCheck(generated, request.input)
    : [];

  return {
    content: generated.content,
    structuredFacts: generated.structuredFacts,
    safety,
    factCheckFlags,
    // AI output is deliberately never auto-published, even when all checks pass.
    status: "needs_review",
    cost: {
      model: generated.model ?? null,
      promptTokens: generated.promptTokens ?? 0,
      completionTokens: generated.completionTokens ?? 0,
      estimatedCostUsd: generated.estimatedCostUsd ?? 0,
    },
  };
}
