import "server-only";

export interface MonitoringProvider {
  captureException(error: unknown, context: Record<string, string | undefined>): void | Promise<void>;
  captureMessage(message: string, context: Record<string, string | undefined>): void | Promise<void>;
}

const noopProvider: MonitoringProvider = { captureException() {}, captureMessage() {} };
let provider = noopProvider;

export function configureMonitoring(nextProvider: MonitoringProvider) { provider = nextProvider; }
export function captureException(error: unknown, context: Record<string, string | undefined> = {}) { return provider.captureException(error, context); }
export function captureMessage(message: string, context: Record<string, string | undefined> = {}) { return provider.captureMessage(message, context); }
