// Byte-pair-encoding tokeniser for the from-scratch v3 model. It mirrors
// ml/bpe_tokenizer.py exactly; the merge rules were learned from training
// profile text only and are read from a local file, never from a model hub.

export interface TokenizerPayload {
  format: string;
  max_length: number;
  vocabulary: Record<string, number>;
  merges: string[][];
}

const FORMAT = "alumnikonneqt-bpe-v1";
const END = "</w>";
const UNKNOWN = "<unk>";
// ASCII letters, digits and white space only, so Unicode case and space rules cannot differ from Python.
const WORD = /[a-z0-9]+|[^ \t\n\r\f\va-z0-9]/gu;

export class ScratchTokenizer {
  readonly maxLength: number;
  private readonly vocabulary: Map<string, number>;
  private readonly ranks = new Map<string, number>();
  private readonly cache = new Map<string, string[]>();
  private readonly unknown: number;

  constructor(payload: TokenizerPayload) {
    if (payload.format !== FORMAT) throw new Error("Unknown tokeniser format");
    this.maxLength = payload.max_length;
    this.vocabulary = new Map(Object.entries(payload.vocabulary));
    payload.merges.forEach(([left, right], rank) => this.ranks.set(`${left}\u0000${right}`, rank));
    const unknown = this.vocabulary.get(UNKNOWN);
    if (unknown === undefined) throw new Error("Tokeniser has no unknown token");
    this.unknown = unknown;
  }

  private pieces(word: string): string[] {
    const cached = this.cache.get(word);
    if (cached) return cached;
    const parts = Array.from(word);
    parts[parts.length - 1] += END;
    while (parts.length > 1) {
      let best = this.ranks.size;
      let at = -1;
      for (let i = 0; i < parts.length - 1; i++) {
        const rank = this.ranks.get(`${parts[i]}\u0000${parts[i + 1]}`);
        if (rank !== undefined && rank < best) {
          best = rank;
          at = i;
        }
      }
      if (at < 0) break;
      parts.splice(at, 2, parts[at] + parts[at + 1]);
    }
    if (this.cache.size < 50_000) this.cache.set(word, parts);
    return parts;
  }

  /** Token ids without padding, truncated to maxLength. Never empty. */
  ids(text: string): number[] {
    const lowered = text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
    const found: number[] = [];
    for (const word of lowered.match(WORD) ?? []) {
      for (const piece of this.pieces(word)) {
        found.push(this.vocabulary.get(piece) ?? this.unknown);
        if (found.length === this.maxLength) return found;
      }
    }
    return found.length ? found : [this.unknown];
  }

  /** Row-major int64 ids for a batch, each row padded with 0 to maxLength. */
  encode(texts: string[]): BigInt64Array {
    const values = new BigInt64Array(texts.length * this.maxLength);
    texts.forEach((text, row) => {
      this.ids(text).forEach((id, column) => {
        values[row * this.maxLength + column] = BigInt(id);
      });
    });
    return values;
  }
}
