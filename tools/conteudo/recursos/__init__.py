from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=None)
def ler_recurso(nome):
    return (Path(__file__).parent / nome).read_text(encoding="utf-8")
