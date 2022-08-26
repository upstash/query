import { Collection } from "./pkg/collection.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.12.0/mod.ts";

type User = {
  name: {
    first: string;
    last: string;
  };
  age: number;
  email: string;
};

const c = new Collection<User>({
  name: "test",
  redis: new Redis({
    url: "https://eu2-driven-skink-30677.upstash.io",
    token:
      "AXfVASQgOGExMmUxM2QtNTcwMy00MjY1LWI5ZGQtZDk4MGJkNTk5YTk4MTdmMDU0NTYwM2E1NDgzNzhmNmJmMjFkNjQ0NjBmZGY=",
    automaticDeserialization: false
  }),

});

const i = c.createIndex({
  name: "users_by_name",
  terms: ["name.first"],
});

const { documentId } = await c.createDocument({
  name: { first: "andreas", last: "thomas" },
  age: 29,
  email: "andreas@upstash.com",
});
console.log({ documentId });

const user = await c.readDocument(documentId);
console.log({ user });

const match = await i.match({ "name.first": "andreas" });
console.log(JSON.stringify({ match }, null, 2));
