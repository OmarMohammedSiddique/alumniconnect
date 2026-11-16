"""Byte-pair-encoding tokeniser trained from scratch on training profile text. Standard library only.

No pretrained vocabulary is involved: the merge rules are learned here from the text passed to
`train`, and saved as a plain `tokenizer.json` that both Python and the Node application read.

Encoding contract (mirrored exactly in lib/scratch-tokenizer.ts):

1. Lower-case ASCII letters A to Z only. Other characters are left as they are, so Python and
   JavaScript cannot disagree about Unicode case rules.
2. Split into words: runs of [a-z0-9], or any other single character that is not ASCII white space.
3. Split a word into characters, mark the last one with END, then apply merges in learned order.
4. Map pieces to ids; unknown pieces map to UNK. Truncate to `max_length`; pad with PAD (0).
   An empty text becomes a single UNK so every row has at least one real token.
"""
import json
import re
from collections import Counter

PAD, UNK, MASK = "<pad>", "<unk>", "<mask>"
END = "</w>"
SPACE = " \t\n\r\f\v"  # ASCII white space only, so Python and JavaScript split identically
WORD = re.compile(r"[a-z0-9]+|[^ \t\n\r\f\va-z0-9]")
UPPER = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
FORMAT = "alumnikonneqt-bpe-v1"


def words(text):
    return WORD.findall(text.translate(UPPER))


def symbols(word):
    return tuple(word[:-1]) + (word[-1] + END,)


def train(texts, vocabulary_size, max_length):
    """Learn merges from `texts`. Deterministic: ties go to the alphabetically first pair."""
    counts = Counter(word for text in texts for word in words(text))
    split = {word: list(symbols(word)) for word in counts}
    alphabet = sorted({piece for pieces in split.values() for piece in pieces})
    merges = []
    while len(alphabet) + len(merges) + 3 < vocabulary_size:
        pairs = Counter()
        for word, pieces in split.items():
            for left, right in zip(pieces, pieces[1:]):
                pairs[(left, right)] += counts[word]
        if not pairs:
            break
        best = min(pairs, key=lambda pair: (-pairs[pair], pair))
        if pairs[best] < 2:
            break
        merges.append(best)
        joined = best[0] + best[1]
        for word, pieces in split.items():
            if len(pieces) < 2:
                continue
            merged, index = [], 0
            while index < len(pieces):
                if index + 1 < len(pieces) and pieces[index] == best[0] and pieces[index + 1] == best[1]:
                    merged.append(joined)
                    index += 2
                else:
                    merged.append(pieces[index])
                    index += 1
            split[word] = merged
    pieces = [PAD, UNK, MASK] + alphabet + [left + right for left, right in merges]
    return {"format": FORMAT, "max_length": max_length, "vocabulary": {piece: index for index, piece in enumerate(pieces)},
            "merges": [list(pair) for pair in merges]}


class Tokenizer:
    def __init__(self, payload):
        if payload.get("format") != FORMAT:
            raise ValueError("unknown tokeniser format")
        self.payload = payload
        self.vocabulary = payload["vocabulary"]
        self.max_length = payload["max_length"]
        self.ranks = {tuple(pair): rank for rank, pair in enumerate(payload["merges"])}
        self.cache = {}

    @classmethod
    def load(cls, path):
        with open(path, encoding="utf-8") as handle:
            return cls(json.load(handle))

    def save(self, path):
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(self.payload, handle, ensure_ascii=True, indent=0)
            handle.write("\n")

    def pieces(self, word):
        if word not in self.cache:
            parts = list(symbols(word))
            while len(parts) > 1:
                rank, index = min((self.ranks.get(pair, len(self.ranks)), i) for i, pair in enumerate(zip(parts, parts[1:])))
                if rank == len(self.ranks):
                    break
                parts[index:index + 2] = [parts[index] + parts[index + 1]]
            self.cache[word] = parts
        return self.cache[word]

    def ids(self, text):
        """Token ids without padding, truncated to max_length. Never empty."""
        unknown = self.vocabulary[UNK]
        found = [self.vocabulary.get(piece, unknown) for word in words(text) for piece in self.pieces(word)]
        return found[:self.max_length] or [unknown]

    def encode(self, texts):
        """Rows of exactly max_length ids, padded with 0."""
        rows = []
        for text in texts:
            found = self.ids(text)
            rows.append(found + [0] * (self.max_length - len(found)))
        return rows
