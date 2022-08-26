/**
 * EncoderDecoder is to allow the user to use different encodings, like json, msgpack etc.
 */
export interface EncoderDecoder {
  encode<T = unknown>(data: T): string;
  decode<T = unknown>(s: string): T;
}

/**
 * Json implements the EncoderDecoder using javascripts `JSON` utility.
 */
export class Json implements EncoderDecoder {
  encode<T = unknown>(data: T): string {
    return JSON.stringify(data);
  }
  decode<T = unknown>(s: string): T {
    return JSON.parse(s);
  }
}
