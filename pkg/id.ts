const prefixes = {
  "document": "doc",
  "index": "idx",
};

/**
 * newId generates a new unique id with a predefined prefix
 * @example
 * newId("document") -> "doc_xxxxxxxxxxxxxx"
 */
export function newId(prefix: keyof typeof prefixes): string {
  if (!(prefix in prefixes)) {
    throw new Error(`Unknown prefix: ${prefix}`);
  }

  const id = crypto.randomUUID().replace(/-/g, "");

  return `${prefixes[prefix]}_${id}`;
}
