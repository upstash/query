import type { Pipeline } from "@upstash/redis/types/pkg/pipeline";
import { Data, Document } from "./types";

export enum Event {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
}

/**
 * A callback receives a transaction, that should be used to append all necessary steps.
 */
export type Callback<TData extends Data> = (
  tx: Pipeline,
  documents: Document<TData>[],
) => Promise<void>;

/**
 * Interceptor is used to perform different actions in response to CRUD events.
 */
export class Interceptor<TData extends Data> {
  /**
   * Looks like this:
   * {
   *  create: {
   *    [uuid]: callback
   *  },
   * update: {
   *    [uuid]: callback
   *  },
   * delete: {
   *    [uuid]: callback
   *  }
   * }
   */
  private readonly callbacks: Record<Event, Record<string, Callback<TData>>>;
  constructor() {
    this.callbacks = {} as Record<Event, Record<string, Callback<TData>>>;
    for (const event of Object.values(Event)) {
      this.callbacks[event] = {};
    }
  }

  /**
   * Returns a function that can be used to unregister the callback.
   */
  public listen(event: Event, callback: Callback<TData>): () => void {
    const id = Math.random().toString()

    this.callbacks[event][id] = callback;

    return () => {
      delete this.callbacks[event][id];
    };
  }

  public async emit(event: Event, tx: Pipeline, ...documents: Document<TData>[]) {
    await Promise.all(
      Object.values(this.callbacks[event]).map(async (cb) => await cb(tx, documents)),
    );
  }
}
