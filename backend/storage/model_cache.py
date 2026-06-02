import threading
import time
from typing import Optional


class ModelCache:
    """
    Thread-safe in-memory cache for loaded sklearn pipelines.
    - Stores pipelines by model_id so Supabase is only hit once per model.
    - TTL (time-to-live): cached pipelines auto-expire after a set time
      so stale models don't live forever if you retrain.
    - Max size: if cache exceeds max_size, the oldest entry is evicted
      so memory doesn't grow unbounded if you have many models.
    """

    def __init__(self, ttl_seconds: int = 1800, max_size: int = 10):
        """
        ttl_seconds : how long a cached pipeline lives (default 30 min)
        max_size    : max number of pipelines to hold in memory (default 10)
        """
        self._cache: dict = {}  # model_id → {"pipeline": ..., "loaded_at": ...}
        self._lock = threading.Lock()
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size

    # ─────────────────────────────────────────
    # PUBLIC API
    # ─────────────────────────────────────────

    def get(self, model_id: str) -> Optional[object]:
        """
        Returns the cached pipeline if it exists and hasn't expired.
        Returns None if missing or expired (triggers a fresh download).
        """
        with self._lock:
            entry = self._cache.get(model_id)

            if entry is None:
                return None

            # Check TTL
            age = time.time() - entry["loaded_at"]
            if age > self.ttl_seconds:
                print(f"  Cache expired for {model_id} (age: {age:.0f}s) — evicting")
                del self._cache[model_id]
                return None

            print(f"  Cache HIT for {model_id} (age: {age:.0f}s)")
            return entry["pipeline"]

    def set(self, model_id: str, pipeline: object):
        """
        Stores a pipeline in the cache.
        Evicts the oldest entry if cache is full.
        """
        with self._lock:
            # Evict oldest if at capacity
            if len(self._cache) >= self.max_size and model_id not in self._cache:
                oldest_id = min(self._cache, key=lambda k: self._cache[k]["loaded_at"])
                print(f"  Cache full — evicting oldest: {oldest_id}")
                del self._cache[oldest_id]

            self._cache[model_id] = {"pipeline": pipeline, "loaded_at": time.time()}
            print(
                f"  Cache SET for {model_id} ({len(self._cache)}/{self.max_size} slots used)"
            )

    def invalidate(self, model_id: str):
        """
        Removes a specific model from cache.
        Call this when a model is deleted or retrained.
        """
        with self._lock:
            if model_id in self._cache:
                del self._cache[model_id]
                print(f"  Cache invalidated for {model_id}")

    def clear(self):
        """Wipes the entire cache."""
        with self._lock:
            self._cache.clear()
            print("  Cache cleared.")

    def stats(self) -> dict:
        """Returns cache diagnostics — useful for a /cache/stats debug endpoint."""
        with self._lock:
            now = time.time()
            entries = []
            for model_id, entry in self._cache.items():
                age = now - entry["loaded_at"]
                entries.append(
                    {
                        "model_id": model_id,
                        "age_seconds": round(age, 1),
                        "expires_in": round(max(0, self.ttl_seconds - age), 1),
                    }
                )
            return {
                "cached_models": len(self._cache),
                "max_size": self.max_size,
                "ttl_seconds": self.ttl_seconds,
                "entries": entries,
            }


# Single shared instance — import this everywhere
model_cache = ModelCache(ttl_seconds=1800, max_size=10)
