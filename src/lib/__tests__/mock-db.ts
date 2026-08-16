/* Banco em memória para os testes (mesma superfície usada pelo código). */
import { vi } from "vitest";

export interface MockState {
  settings: Record<string, unknown>;
  leads: Record<string, unknown>[];
  paymentEvents: { transaction_id: string; status: string }[];
}

export function createMockDb(state: MockState) {
  function table(name: string) {
    const filters: [string, unknown][] = [];
    const api: Record<string, unknown> = {};
    const rows = () =>
      name === "leads"
        ? state.leads
        : name === "payment_events"
          ? (state.paymentEvents as unknown as Record<string, unknown>[])
          : [state.settings];
    const matches = (r: Record<string, unknown>) => filters.every(([k, v]) => r[k] === v);

    api["select"] = () => api;
    api["eq"] = (k: string, v: unknown) => {
      filters.push([k, v]);
      return api;
    };
    api["maybeSingle"] = async () => ({ data: rows().find(matches) ?? null, error: null });
    api["insert"] = async (row: Record<string, unknown>) => {
      if (name === "payment_events") {
        const dup = state.paymentEvents.some(
          (e) => e.transaction_id === row["transaction_id"] && e.status === row["status"],
        );
        if (dup) return { error: { message: "duplicate key" } };
        state.paymentEvents.push(row as { transaction_id: string; status: string });
        return { error: null };
      }
      state.leads.push(row);
      return { error: null };
    };
    api["update"] = (patch: Record<string, unknown>) => {
      const chain: Record<string, unknown> = {
        eq: async (k: string, v: unknown) => {
          filters.push([k, v]);
          rows()
            .filter(matches)
            .forEach((r) => Object.assign(r, patch));
          return { error: null };
        },
      };
      return chain;
    };
    api["delete"] = () => {
      const chain: Record<string, unknown> = {
        eq: (k: string, v: unknown) => {
          filters.push([k, v]);
          const keep = state.paymentEvents.filter(
            (e) => !matches(e as unknown as Record<string, unknown>),
          );
          const done = { error: null };
          state.paymentEvents.length = 0;
          state.paymentEvents.push(...keep);
          return Object.assign(Promise.resolve(done), chain);
        },
      };
      return chain;
    };
    api["upsert"] = async (row: Record<string, unknown>) => {
      state.leads.push(row);
      return { error: null };
    };
    return api;
  }
  return { from: (name: string) => table(name) };
}

export function mockDbModule(state: MockState) {
  vi.doMock("@/lib/db.server", () => ({ getDb: () => createMockDb(state) }));
}
