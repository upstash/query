import { ArrToKeys, Data, Document, Field } from "./types.ts";
import type { DotNotation } from "./dot-notation.ts";
import { Collection } from "./collection.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.12.0/mod.ts";
import { Event, Interceptor } from "./interceptor.ts";
import { Pipeline } from "https://deno.land/x/upstash_redis@v1.12.0/pkg/pipeline.ts";
import { INDEX_PREFIX } from "./constants.ts";
import type { EncoderDecoder } from "./encoding.ts";

export type IndexConfig<
  TData extends Data,
  TTerms extends DotNotation<TData>[],
> = {
  name: string;
  collection: Collection<TData>;
  terms: TTerms;
  redis: Redis;
  unique?: boolean;
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

    this.interceptor.listen(
      Event.CREATE,
      async (tx, documents) => await this.index(tx, documents),
    );

    // this.interceptor.listen(
    //     Event.UPDATE,
    //     async (tx, ...docs) => {
    //         await this.removeFromIndex(tx, docs.map((doc) => doc.id));
    //         await this.index(tx, docs);
    //     },
    // )

    // this.interceptor.listen(
    //     Event.DELETE,
    //     async (tx, ...docs) => await this.removeFromIndex(tx, docs.map((doc) => doc.id)),
    // )
  }

  /**
   * Build the key for a given document id or hash
   */
  private key(
    arg: { id: string; hash?: never } | { id?: never; hash: string },
  ): string {
    if (arg.id) {
      return [
        this.collection.prefix(),
        INDEX_PREFIX,
        this.name,
        "document_ids",
        arg.id,
      ].join(":");
    }
    if (arg.hash) {
      return [
        this.collection.prefix(),
        INDEX_PREFIX,
        this.name,
        "hashes",
        arg.hash,
      ].join(":");
    }
    throw new Error(`Invalid argument ${arg}`);
  }

  public async index(
    tx: Pipeline,
    documents: Document<TData>[],
  ): Promise<void> {
    for (const document of documents) {
      const terms = this.terms.reduce((acc, field) => {
        let v: any = document.data;

        for (const key of field.split(".")) {
          if (key in v) {
            v = v[key];
          }
        }
        acc[field] = v as any;
        return acc;
      }, {} as TData);
      const hash = await this.hashTerms(terms);
      const id = document.id;

      tx.sadd(this.key({ id }), hash);

      tx.sadd(this.key({ hash }), id);
    }
  }

  private hashTerms = async (
    terms: Record<ArrToKeys<TTerms>, unknown>,
  ): Promise<string> => {
    const keys = Object.keys(terms).sort() as TTerms;
    const bufs: Uint8Array[] = [];
    for (const key of keys) {
      // const value = path.reduce((acc, key) => acc[key], terms);
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
    return Array.from(new Uint8Array(hash)).map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  };

  public match = async (
    matches: Record<ArrToKeys<TTerms>, Field>,
  ): Promise<Document<Pick<TData, TValues[number]>>[]> => {
    const hash = await this.hashTerms(matches);
    const ids = await this.redis.smembers(this.key({ hash }));
    console.log("matching", { matches, hash, ids });
    if (ids.length === 0) {
      return [];
    }

    const documents = await this.collection.listDocuments(ids);

    return documents;
  };
}
