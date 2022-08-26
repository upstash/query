# @upstash/query

## API Reference

### Collections

```ts
type User = {
  name: {
    first: string;
    last: string;
  };
  age: number;
};

import { Collection } from "@upstash/query";
import { Redis } from "@upstash/redis";

// Create a collection
const c = new Collection<User>({
  name: "users",
  redis: Redis.fromEnv(),
  /**
   *  Optionally a custom encoder can be specified, default is json
   *
   * export interface EncoderDecoder {
   *   encode<T = unknown>(data: T): string;
   *   decode<T = unknown>(s: string): T;
   * }
   */
  encoderDecoder: {
    encode: (data) => JSON.stringify(data),
    decode: (str) => JSON.parse(s),
  },
});
```

I think I want to change this to something like:

```ts
import { Query } from "@upstash/query";
import { Redis } from "@upstash/redis";

const q = new Query({
    redis: Redis.fromEnv(),
    encoderDecoder: ...
})
// Create a collection
const c = q.createCollection<User>({...
```

Otherwise it can be tedious to create multiple collections.

Insert a document

```ts
const { documentId } = await c.createDocument({
  name: {
    first: "John",
    last: "Doe",
  },
  age: 42,
});
```

Get a document

```ts
const user = await c.getDocument(documentId);
```

Set a document: this overwrites the document We can't do a partial update,
because there's no way to do this atomically using redis `STRING`. We would have
to read the document, decode it, update some fields, encode it again and then
write to redis. That's a little bit too complicated to do in lua for an MVP.

Initially I used a `HASH` to store the individual fields of a document but this
was very costly when retrieving multiple documents, because `HMGET` works on a
single hash, while `MGET` works on multiple keys

Using this approach, we can retrieve all documents, that match a secondary index
query, in a single `MGET` call (as long as the total size does not exceed the
1MB limit)

Let me know what you think about that tradeoff

```ts
const { documentId } = await c.setDocument(documentId, {
  name: { first: "John", last: "Doe" },
  age: 42,
});
```

Delete a document

```ts
await c.deleteDocument(documentId);
```

### Secondary Indices

Same types from above

Give the index a name and an array of `terms` each term is a path to a field in
the document and is using some typescript magic, to only allow paths that are
actually valid for the document. (If I would set `terms: ["name.hello"]` I would
get a type error)

```ts
const index = c.createIndex({
  name: "users_by_name",
  terms: ["name.first"],
});
```

Query the index

```ts
const match = await i.match({ "name.first": "andreas" });

// returns
[
  {
    "id": "doc_a61ee39e4b5a43a08c6e5a5cee45b77d",
    "data": {
      "name": {
        "first": "andreas",
        "last": "thomas",
      },
      "age": 29,
    },
    "ts": 1661544215734,
  },
  {
    // other hits
  },
];
```

## Range Queries

Secondary indices are good for exact matches, but we can use sorted sets to do
ranged queries too

```ts
const r = c.createRangeIndex({
  name: "users_by_age",
  term: "age",
});

// supported are: gt, gte, lt, lte
const olderThan30 = await r.range({ gt: 30 });
// returns the same as a regular index
```

Technically we can also use sorted sets to do lexicographical queries, but this
is enough as an MVP I think.
