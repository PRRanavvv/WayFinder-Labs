from typing import Any, Protocol


class PlaceProvider(Protocol):
    """Replaceable source of place intelligence for deterministic engines."""

    def list_places(self) -> list[dict[str, Any]]: ...
