# Semantix: one-page overview

> **Semantix is a governed gateway that gives every person and every AI agent the same definition of every business metric.**

## Problem
- "Revenue", "return rate" and "active customer" are defined differently in dashboards, SQL and spreadsheets.
- AI agents guess joins and metric logic, so they answer confidently and wrongly.
- Every definition change is an engineering ticket, so data engineers become the bottleneck.

## Solution
Metrics, filters, rules and verified queries live in one versioned **semantic view**, stored as YAML in a Git repository.

| Role | What they do |
|---|---|
| Business user | Suggests a change in plain words |
| Data analyst | Reviews, tests and batches changes into one merge request |
| Data engineer | Approves and merges. The change goes live |
| AI agent | Connects over MCP and receives definitions and SQL |

## How it works
1. A YAML semantic view is validated (Pydantic), checked for cycles and broken dependencies (NetworkX) and compiled to SQL through the sqlglot AST. Every division gets a `NULLIF` guard.
2. A change goes through request, analyst review, 7-day test, merge request, merge, live.
3. Agents connect with one address and one key per connection. A profile sets views, tools, version and limits.
4. Semantix sends definitions and SQL only. The agent runs the SQL itself under its own read-only role. Restricted fields are never sent.

## Status
| Part | State |
|---|---|
| FastAPI backend: validation, DAG check, SQL compile, MCP and REST endpoints, simulated 7-day test | **Built**, 15 tests passing |
| React UI for three roles plus MCP console, import and publish of views | **Prototype**, mock data, not wired to the backend |
| Snowflake and GitLab connections, real MCP protocol, sign-in with OAuth, hybrid deployment | **Proposed** |

## Open questions (unverified)
- Do target agents need the standard MCP protocol, and do they sign in with keys or OAuth?
- Snowflake and GitLab setup templates need review by the company's administrators.
- Market size, competitors, pricing, traction: not sourced.
