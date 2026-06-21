import type {
  HvacFilterCondition,
  TaskCompletion,
  TaskCompletionRecord,
} from "@/tools/home-maintenance/types/completion";

export function normalizeCompletion(
  value: TaskCompletionRecord | undefined,
): TaskCompletion | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return { at: value };
  }
  if (typeof value.at === "string") {
    return value;
  }
  return undefined;
}

export function getCompletionAt(value: TaskCompletionRecord | undefined): string | undefined {
  return normalizeCompletion(value)?.at;
}

export function getCompletionCondition(
  value: TaskCompletionRecord | undefined,
): HvacFilterCondition | undefined {
  return normalizeCompletion(value)?.condition;
}

export function completionToRecord(completion: TaskCompletion): TaskCompletion {
  return completion;
}
