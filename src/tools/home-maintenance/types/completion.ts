export type HvacFilterCondition = "clean" | "moderate-dust" | "replace-needed";

export interface TaskCompletion {
  at: string;
  condition?: HvacFilterCondition;
}

export type TaskCompletionRecord = TaskCompletion | string;
