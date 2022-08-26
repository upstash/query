export type Field = string | number | boolean | null | Field[] | {
  [key: string]: Field;
};

export type Data = Record<string, Field>;

/**
 * A document is stored as a redis hash, with a single reserved field `_meta`.
 */
export type Document<TData extends Data> = {
  id: string;
  ts: number;
  data: TData;
};

/**
 * ArrToKeys transforms an array of strings into a record of keys.
 *
 * @example
 * ArrToKeys<["a","b"]> => "a" | "b"
 */
export type ArrToKeys<T extends unknown[]> = T[number];
