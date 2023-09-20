export class Script {
  private script: string;
  private keys: string[];
  private args: string[];

  public append(snippet: string, keys: string[], args: string[]) {
    this.script += "\n";
    this.script += snippet;
    this.keys.push(keys);
    this.args.push(args);
  }

  public keyOffset(): number {
    return this.keys.length;
  }
}
