"""Remove every `sample_values:` block (the key and its list items) from a Snowflake semantic view YAML.

Usage (run it yourself, on the ORIGINAL export, not on a hand-edited copy):
    python3 strip_sample_values.py semantic_view.yaml semantic_view.clean.yaml
It prints only counts. Nothing else in the file is changed.
"""
import sys

import yaml

src, dst = sys.argv[1], sys.argv[2]
out, skipping, removed = [], None, 0
for line in open(src, encoding="utf-8"):
    indent = len(line) - len(line.lstrip(" "))
    s = line.strip()
    if skipping is not None:
        # list items of the block sit at the key's indent or deeper
        if s.startswith("- ") or s == "-" or (s and indent > skipping):
            continue
        skipping = None
    if s.startswith("sample_values:"):
        skipping, removed = indent, removed + 1
        continue
    out.append(line)
open(dst, "w", encoding="utf-8").writelines(out)

doc = yaml.safe_load(open(dst, encoding="utf-8"))  # fails loudly if the result is not valid YAML

# Drop the verified query that selects full consumer profiles.
before = len(doc.get("verified_queries", []))
doc["verified_queries"] = [q for q in doc.get("verified_queries", []) if "full profile details" not in f"{q.get('name', '')} {q.get('question', '')}".lower()]
dropped = before - len(doc["verified_queries"])

# Guard: every table must still be a table (a hand edit once merged four tables into one).
names = [t["name"] for t in doc["tables"]]
EXPECTED = 7
if len(names) != EXPECTED:
    sys.exit(f"STOP: found {len(names)} tables, expected {EXPECTED}: {names}\nThis input was probably edited by hand. Use a fresh original export.")

yaml.safe_dump(doc, open(dst, "w", encoding="utf-8"), sort_keys=False, allow_unicode=True, width=10_000)
print(f"removed {removed} sample_values blocks, dropped {dropped} consumer-profile verified query")
print(f"clean file OK: {len(names)} tables, {len(doc['verified_queries'])} verified queries")
print("remaining 'sample_values' mentions:", open(dst, encoding="utf-8").read().count("sample_values"))
