import math
import re

STOP_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}


def normalize_text(value: object) -> str:
    return str(value or "").strip().lower()


def tokenize(text: object) -> list[str]:
    raw_tokens = re.sub(r"[^a-z0-9\s-]", " ", normalize_text(text)).split()
    return [token for token in raw_tokens if token and token not in STOP_WORDS]


def clamp(value: float, lower: float, upper: float) -> float:
    return min(upper, max(lower, value))


def dense_vector_from_text(text: str, dimensions: int = 64) -> list[float]:
    vector = [0.0] * dimensions
    for token in tokenize(text):
        vector[abs(hash(token)) % dimensions] += 1.0
    magnitude = math.sqrt(sum(value * value for value in vector))
    if not magnitude:
        return vector
    return [round(value / magnitude, 8) for value in vector]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(left * right for left, right in zip(a, b, strict=False))
    a_mag = math.sqrt(sum(value * value for value in a))
    b_mag = math.sqrt(sum(value * value for value in b))
    if not a_mag or not b_mag:
        return 0.0
    return dot / (a_mag * b_mag)
