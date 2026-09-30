"""
fake_data.py

A small hand-built dataset (lost + found items) so you can develop
and test scoring/sorting/search/grouping RIGHT NOW, with no dependency
on Package 1's real database.

When Package 1's real DB/API is ready, you swap the data source that
feeds your functions (see main.py) — the functions themselves don't
need to change.
"""

from datetime import date
from models import Item, ItemType, ItemStatus

ITEMS: list[Item] = [
    # --- Lost items ---
    Item(id="L001", type=ItemType.lost, category="bottle", colour="black",
         brand="locknlock", location="robotics_lab",
         event_date=date(2026, 9, 10), description="Small dent near the bottom"),

    Item(id="L002", type=ItemType.lost, category="wallet", colour="brown",
         brand="", location="library",
         event_date=date(2026, 9, 12), description="Leather, has student ID inside"),

    Item(id="L003", type=ItemType.lost, category="umbrella", colour="blue",
         brand="", location="cafeteria",
         event_date=date(2026, 9, 14), description="Automatic open button"),

    Item(id="L004", type=ItemType.lost, category="phone", colour="white",
         brand="apple", location="engineering_lobby",
         event_date=date(2026, 9, 15), description="Cracked screen top-left corner"),

    # --- Found items ---
    Item(id="F001", type=ItemType.found, category="bottle", colour="black",
         brand="locknlock", location="engineering_lobby",
         event_date=date(2026, 9, 10), description="Found near vending machine"),

    Item(id="F002", type=ItemType.found, category="bottle", colour="black",
         brand="", location="robotics_lab",
         event_date=date(2026, 9, 12), description="No brand visible"),

    Item(id="F003", type=ItemType.found, category="wallet", colour="brown",
         brand="", location="library",
         event_date=date(2026, 9, 12), description="Found on a study table"),

    Item(id="F004", type=ItemType.found, category="umbrella", colour="black",
         brand="", location="cafeteria",
         event_date=date(2026, 9, 20), description="Found under a chair"),

    Item(id="F005", type=ItemType.found, category="phone", colour="white",
         brand="apple", location="library",
         event_date=date(2026, 9, 16), description="Found in a book return slot"),
]


def get_all_items() -> list[Item]:
    """Stand-in for a real DB query. Returns a COPY so callers can't
    accidentally mutate the shared fake dataset."""
    return [item.model_copy() for item in ITEMS]
