import type { Redis } from "@upstash/redis";
import { Collection } from "./collection";
import { EncoderDecoder, Json } from "./encoding";
import { Data } from "./types";
import { VERSION } from "./version";

type QueryConfig = {
  /**
   *T he `redis` property is an instance of the Redis class. It is used to interact with a Redis 
   database for storing and retrieving data.
   */
  redis: Redis;
  /*
   * The `encoderDecoder` property is an optional parameter that specifies an object responsible for
   * encoding and decoding data. It is used in the `Query` class to serialize and deserialize data
   * when interacting with the Redis database. If no `encoderDecoder` is provided, it defaults to
   * using a `Json` encoder.
   */
  encoderDecoder?: EncoderDecoder;
};

/*
 * The Query class is responsible for creating collections and managing the Redis connection and
 * encoder/decoder.
 */
export class Query {
  private readonly redis: Redis;
  private encoderDecoder: EncoderDecoder;

  constructor(config: QueryConfig) {
    this.redis = config.redis;
    try {
      // @ts-ignore - this is hidden
      this.redis.addTelemetry({ sdk: `@upstash/query@${VERSION}` });
    } catch {
      // ignore
    }
    this.encoderDecoder = config.encoderDecoder ?? new Json();
  }

  /**
   * The function creates a new collection with the given name and returns it.
   * @param {string} name - A string representing the name of the collection.
   * @returns The `createCollection` method is returning an instance of the `Collection` class with the specified name, redis connection, and encoder/decoder.
   */
  public createCollection<TData extends Data>(name: string): Collection<TData> {
    return new Collection<TData>({
      name,
      redis: this.redis,
      encoderDecoder: this.encoderDecoder,
    });
  }
}
