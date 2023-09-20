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
  public readonly debug: boolean
  constructor(opts?: { debug?: boolean }) {
    this.debug = opts?.debug ?? false
  }
  encode<T = unknown>(data: T): string {
    if (this.debug) {
      console.debug("encoding", data)

    }
    return JSON.stringify(data, null, 2);
  }
  decode<T = unknown>(s: string): T {
    if (this.debug) {
      console.debug("decoding", s)
    }
    return JSON.parse(s);
  }
}


