# Hybrid deployment: technical brief

> **Status: Proposed.** This is the target architecture. The built MVP is a single local service (stateless, local-only). Billing and multi-tenancy are out of scope in `SEMANTIX_MVP_SPEC.md`. Review with security before sending externally.

## Idea
Run the engine inside the customer's network. The vendor cloud handles only licensing, billing and updates.

```
Customer VPC                                   Semantix Cloud
┌──────────────────────────────────┐          ┌─────────────────────┐
│ Semantix engine                  │          │ Licensing, billing  │
│  - reads Snowflake schema        │◄────────►│ Release updates     │
│  - validates + compiles (AST)    │ no rows, │ (no customer data,  │
│  - syncs with company Git        │ no creds │  no credentials)    │
│  - serves MCP / REST             │          └─────────────────────┘
└───────┬──────────────────┬───────┘
        │ definitions + SQL│
   Agents / BI         Company GitLab
   (run SQL with own read-only role)
```

## What runs where
| Capability | Location | Status |
|---|---|---|
| Schema reads from the warehouse | Customer VPC | Proposed. No Snowflake driver in the MVP |
| Validation, DAG check, sqlglot SQL compile, NULLIF guard | Customer VPC | **Built** |
| Git sync of view files | Customer VPC | Prototype (simulated). MVP stores proposal YAML files |
| MCP and REST endpoints | Customer VPC | **Built** (simplified) |
| Licensing, billing, release updates | Vendor cloud | Proposed |

## Security properties (design intent)
1. **No row-level data crosses to the vendor.** The engine sees logical schemas and definitions, not rows.
2. **No warehouse credentials in the compiler.** The graph and compiler never receive credentials (spec rule).
3. **Agents get definitions and SQL only.** They execute under their own read-only role, so the warehouse enforces access.
4. **Restricted fields are not sent** to agents.
5. **Every change is traceable** through merge requests in Git.
6. **Errors are structured**, with no stack traces leaked.

## Caveats
- "Zero data transit" holds only if the engine never reads rows. Schema names and metric definitions can still be sensitive. Decide what the license check sends.
- Agent sign-in (keys or OAuth) is undecided.
- Snowflake and GitLab setup templates are unverified and need review by the company's administrators.
- The Python Snowflake connector would be a new dependency beyond the spec's list.
