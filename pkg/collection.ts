import type { Data } from "./types.ts";
import type { Redis } from "https://deno.land/x/upstash_redis@v1.12.0/mod.ts";
import { Event, Interceptor } from "./interceptor.ts";
import { COLLECTION_PREFIX, DEFAULT_PREFIX } from "./constants.ts";
import { newId } from "./id.ts";
import { EncoderDecoder, Json } from "./encoding.ts";
import type { Document } from "./types.ts";
import { Index } from "./index.ts";
import type { DotNotation } from "./dot-notation.ts";

export type CollectionConfig = {
  name: string;
  redis: Redis;
  encoderDecoder?: EncoderDecoder;
};
export class Collection<TData extends Data> {
  public readonly name: string;
  public readonly redis: Redis;

  private readonly interceptor: Interceptor<TData>;

  private readonly enc: EncoderDecoder;

  constructor(cfg: CollectionConfig) {
    if (cfg.name.length === 0) {
      throw new Error("Collection name cannot be empty");
    }
    this.name = cfg.name;
    this.redis = cfg.redis;
    this.interceptor = new Interceptor<TData>();
    this.enc = cfg.encoderDecoder || new Json();
  }

  /**
   * prefix returns the key prefix for the collection.
   */
  public prefix(): string {
    return [DEFAULT_PREFIX, COLLECTION_PREFIX, this.name].join(":");
  }
  /**
   * key prefixes a document id and returns a key to be used in redis.
   */
  public key(documentId: string): string {
    return [this.prefix(), documentId].join(":");
  }

  /**
   * createDocument inserts a new document into the collection.
   *
   * All existing interceptors are called after the document is inserted.
   */
  public async createDocument(data: TData): Promise<{ documentId: string }> {
    const id = newId("document");
    const key = this.key(id);

    const document: Document<TData> = {
      id,
      data,
      ts: Date.now(),
    };

    const tx = this.redis.pipeline();
    tx.set(key, this.enc.encode(document));
    await this.interceptor.emit(Event.CREATE, tx, document);
    await tx.exec();
    return { documentId: id };
  }

  /**
   * readDocument loads a document by its id.
   *
   * Return `null` if the document does not exist.
   */
  public async readDocument(
    documentId: string,
  ): Promise<Document<TData> | null> {
    const key = this.key(documentId);
    const document = await this.redis.get<string>(key);
    if (!document) {
      return null;
    }
    return this.enc.decode<Document<TData>>(document);
  }

  /**
   * listDocuments loads multiple documents by their ids or all existing documents if no ids are provided.
   */
  public async listDocuments(
    documentIds?: string[],
  ): Promise<Document<TData>[]> {
    let documents: string[] = [];
    if (documentIds) {
      documents = await this.redis.mget(
        ...documentIds.map((id) => this.key(id)),
      );
    } else {
      const documentKeys: string[] = [];
      let cursor = 0;
      while (true) {
        const [c, keys] = await this.redis.scan(cursor, {
          match: this.key("*"),
        });
        documentKeys.push(...keys);
        if (c > 0) {
          cursor = c;
        } else {
          break;
        }
      }
      documents = await this.redis.mget(...documentKeys);
    }

    return documents.map((d) => this.enc.decode<Document<TData>>(d));
  }

  /**
   * deleteDocument removes a document from the collection.
   *
   * All existing interceptors are called after the document is removed.
   */
  public async deleteDocument(documentId: string): Promise<void> {
    const key = this.key(documentId);
    const document = await this.readDocument(documentId);
    if (!document) {
      return;
    }
    const tx = this.redis.pipeline();
    tx.del(key);
    await this.interceptor.emit(Event.DELETE, tx, document);
    await tx.exec();
  }

  public createIndex<TTerms extends DotNotation<TData>[]>(
    cfg: { name: string; terms: TTerms },
  ): Index<TData, TTerms> {
    return new Index({
      name: cfg.name,
      collection: this,
      terms: cfg.terms,
      redis: this.redis,
      interceptor: this.interceptor,
      enc: this.enc,
    });
  }
}
