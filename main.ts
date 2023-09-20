import { Redis } from "@upstash/redis";
import { Collection } from "./src/collection";

type User = {
  name: {
    first: string;
    last: string;
  };
  age: number;
  email: string;
};


async function main(){


const users = new Collection<User>({
  name: "test",
  redis: new Redis({
    url: "https://eu2-driven-skink-30677.upstash.io",
    token:
      "AXfVASQgOGExMmUxM2QtNTcwMy00MjY1LWI5ZGQtZDk4MGJkNTk5YTk4MTdmMDU0NTYwM2E1NDgzNzhmNmJmMjFkNjQ0NjBmZGY=",
    automaticDeserialization: false,
  }),
});

const usersByName = users.createIndex({
  name: "users_by_name",
  terms: ["name.first"],
});

await users.set("andreas", {
  name: { first: "andreas", last: "thomas" },
  age: 29,
  email: "andreas@upstash.com",
});

const user = await users.get("andreas");
console.log({ user });

const match = await usersByName.match({ "name.first": "andreas" });

match.at(0)?.data;

console.log(JSON.stringify({ match }, null, 2));

await users.delete("andreas");

console.log(await usersByName.match({ "name.first": "andreas" }));

}
main()