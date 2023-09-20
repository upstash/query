import type { Redis } from "@upstash/redis";
import { Collection } from "./collection";
import { EncoderDecoder, Json } from "./encoding";
import { Data } from "./types";

type QueryConfig = {
  redis: Redis;
  encoderDecoder?: EncoderDecoder;
};

export class Query {
  private readonly redis: Redis;
  private encoderDecoder: EncoderDecoder;

  constructor(config: QueryConfig) {
    this.redis = config.redis;
    this.encoderDecoder = config.encoderDecoder ?? new Json();
  }

  public createCollection<TData extends Data>(name: string): Collection<TData> {
    return new Collection<TData>({
      name,
      redis: this.redis,
      encoderDecoder: this.encoderDecoder,
    });
  }
}
