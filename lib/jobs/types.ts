export interface BackgroundJob<TPayload extends Record<string, unknown>> {
  name: string;
  payload: TPayload;
  idempotencyKey: string;
}

export interface JobDispatcher {
  dispatch<TPayload extends Record<string, unknown>>(job: BackgroundJob<TPayload>): Promise<void>;
}

export const inlineJobDispatcher: JobDispatcher = {
  async dispatch() {
    // Foundation only. Production should replace this with a durable queue adapter.
  },
};
