import type { Redis } from "@upstash/redis";
import { Index } from ".";
import { COLLECTION_PREFIX, DEFAULT_PREFIX } from "./constants";
import type { DotNotation } from "./dot-notation";
import { EncoderDecoder, Json } from "./encoding";
import { Event, Interceptor } from "./interceptor";
import type { Data } from "./types";
import type { Document } from "./types";

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
  public documentKey(documentId: string): string {
    return [this.prefix(), documentId].join(":");
  }

  /**
   * set inserts a new document into the collection.
   *
   * All existing interceptors are called after the document is inserted.
   */
  public async set(id: string, data: TData): Promise<void> {
    const key = this.documentKey(id);

    const document: Document<TData> = {
      id,
      data,
      ts: Date.now(),
    };

    const tx = this.redis.pipeline();
    tx.set(key, this.enc.encode(document));
    await this.interceptor.emit(Event.CREATE, tx, document);
    await tx.exec();
  }

  /**
   * get loads a document by its id.
   *
   * Return `null` if the document does not exist.
   */
  public async get(documentId: string): Promise<Document<TData> | null> {
    const key = this.documentKey(documentId);
    const document = await this.redis.get<string>(key);
    if (!document) {
      return null;
    }
    return this.enc.decode<Document<TData>>(document);
  }

  /**
   * list loads multiple documents by their ids or all existing documents if no ids are provided.
   * 
   * if a document is not found, we don't include it in the response. Therefore the result array
   * might be shorter than your input documentIds or even be empty
   */
  public async list(documentIds?: string[]): Promise<Document<TData>[]> {
    let documents: string[] = [];
    if (documentIds) {
      documents = await this.redis.mget(...documentIds.map((id) => this.documentKey(id)));
    } else {
      const documentKeys: string[] = [];
      let cursor = 0;
      while (true) {
        const [c, keys] = await this.redis.scan(cursor, {
          match: this.documentKey("*"),
        });
        documentKeys.push(...keys);
        if (c > 0) {
          cursor = c;
        } else {
          break;
        }
      }
      if (documentKeys.length > 0) {
        documents = await this.redis.mget(...documentKeys)
      }
    }
    return documents
      // mget returns null for documents that were not found
      .filter(d => d !== null)
      // decode the document
      .map((d) => this.enc.decode<Document<TData>>(d));
  }

  /**
   * delete removes a document from the collection.
   *
   * All existing interceptors are called after the document is removed.
   */
  public async delete(documentId: string): Promise<void> {
    const key = this.documentKey(documentId);
    const document = await this.get(documentId);
    if (!document) {
      return;
    }
    const tx = this.redis.pipeline();
    tx.del(key);
    await this.interceptor.emit(Event.DELETE, tx, document);
    await tx.exec();
  }

  public createIndex<TTerms extends DotNotation<TData>[]>(cfg: {
    name: string;
    terms: TTerms;
  }): Index<TData, TTerms> {
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
