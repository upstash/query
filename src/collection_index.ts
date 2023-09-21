import { Redis } from "@upstash/redis";
import type { Pipeline } from "@upstash/redis/types/pkg/pipeline";
import { Collection } from "./collection";
import { INDEX_PREFIX } from "./constants";
import type { DotNotation } from "./dot-notation";
import type { EncoderDecoder } from "./encoding";
import { Event, Interceptor } from "./interceptor";
import { ArrToKeys, Data, Document } from "./types";

export type IndexConfig<TData extends Data, TTerms extends DotNotation<TData>[]> = {
  name: string;
  collection: Collection<TData>;
  terms: TTerms;
  redis: Redis;
  interceptor: Interceptor<TData>;
  enc: EncoderDecoder;
};
export class Index<TData extends Data, TTerms extends DotNotation<TData>[]> {
  public readonly name: string;
  private readonly collection: Collection<TData>;
  private readonly terms: TTerms;
  private readonly redis: Redis;
  private readonly interceptor: Interceptor<TData>;

  private readonly enc: EncoderDecoder;

  constructor(cfg: IndexConfig<TData, TTerms>) {
    this.name = cfg.name;
    this.collection = cfg.collection;
    this.terms = cfg.terms;
    this.redis = cfg.redis;
    this.interceptor = cfg.interceptor;
    this.enc = cfg.enc;

    this.interceptor.listen(Event.CREATE, async (tx, documents) => await this.index(tx, documents));

    this.interceptor.listen(Event.UPDATE, async (tx, docs) => {
      await this.removeFromIndex(
        tx,
        docs.map((doc) => doc.id),
      );
      await this.index(tx, docs);
    });

    this.interceptor.listen(
      Event.DELETE,
      async (tx, documents) =>
        await this.removeFromIndex(
          tx,
          documents.map((doc) => doc.id),
        ),
    );
  }

  /**
   * Build the key for a given document id or hash
   */
  private indexKey(arg: { id: string; hash?: never } | { id?: never; hash: string }): string {
    if (arg.id) {
      return [this.collection.prefix(), INDEX_PREFIX, this.name, "document_ids", arg.id].join(":");
    }
    if (arg.hash) {
      return [this.collection.prefix(), INDEX_PREFIX, this.name, "hashes", arg.hash].join(":");
    }
    throw new Error(`Invalid argument ${arg}`);
  }

  public async index(tx: Pipeline, documents: Document<TData>[]): Promise<void> {
    for (const document of documents) {
      const terms = this.terms.reduce((acc, field) => {
        // biome-ignore lint/suspicious/noExplicitAny: this is fine
        let v: any = document.data;

        for (const key of field.split(".")) {
          if (key in v) {
            v = v[key];
          }
        }
        // biome-ignore lint/suspicious/noExplicitAny: this is fine
        acc[field] = v as any;
        return acc;
      }, {} as TData);
      const hash = await this.hashTerms(terms);
      const id = document.id;

      tx.sadd(this.indexKey({ id }), hash);

      tx.sadd(this.indexKey({ hash }), id);
    }
  }

  private async removeFromIndex(tx: Pipeline, documentIds: string[]): Promise<void> {
    for (const documentId of documentIds) {
      const indexKey = this.indexKey({ id: documentId });

      const hashes = await this.redis.smembers(indexKey);
      for (const hash of hashes) {
        tx.srem(this.indexKey({ hash }), documentId);
      }
      tx.del(indexKey);
    }
  }

  /**
   * Delete and rebuild the index with all documents in the collection
   */
  public async reIndex(): Promise<void> {
    const documents = await this.collection.list();
    const tx = this.redis.multi();
    await this.removeFromIndex(
      tx,
      documents.map((d) => d.id),
    );
    await this.index(tx, documents);

    await tx.exec();
  }

  private hashTerms = async (terms: Record<ArrToKeys<TTerms>, unknown>): Promise<string> => {
    const keys = Object.keys(terms).sort() as TTerms;
    const bufs: Uint8Array[] = [];
    for (const key of keys) {
      bufs.push(new TextEncoder().encode(key as string));
      bufs.push(new TextEncoder().encode(this.enc.encode(terms[key]!)));
    }
    const buf = new Uint8Array(bufs.reduce((acc, b) => acc + b.length, 0));
    let offset = 0;
    for (const b of bufs) {
      buf.set(b, offset);
      offset += b.length;
    }

    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  public match = async (
    matches: Record<ArrToKeys<TTerms>, TData[ArrToKeys<TTerms>]>,
  ): Promise<Document<TData>[]> => {
    const hash = await this.hashTerms(matches);
    const ids = await this.redis.smembers(this.indexKey({ hash }));
    if (ids.length === 0) {
      return [];
    }

    const documents = await this.collection.list(ids);

    /**
     * Because transactions do not roll back, it could happen that we still have references to documents
     * that have been deleted already.
     *
     * Or maybe the user has manually deleted stuff without reindexing
     *
     * In this case we're cleaning up the index now.
     */
    if (documents.length < ids.length) {
      const found = documents.reduce((acc, d) => {
        acc[d.id] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const notFound = ids.filter((id) => !found[id]);

      if (notFound.length > 0) {
        const tx = this.redis.pipeline();
        await this.removeFromIndex(tx, notFound);
        await tx.exec();
      }
    }

    return documents;
  };
}
