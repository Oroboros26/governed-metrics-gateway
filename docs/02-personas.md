# Personas

Names are demo characters in the prototype. Pain points are illustrative, not from interviews (**unverified**).

## Jean, business user
| | |
|---|---|
| Goal | Get a number I can trust, and get a wrong definition fixed |
| Pain today | Two dashboards disagree. A fix means a ticket and no feedback |
| A typical day | Reads a metric, spots a gap, asks an AI assistant a question |
| What Semantix gives | Plain-language definitions and business context. "Suggest a change" with no SQL. My Changes shows the status |
| Success measure | Time from request to live. Fewer "which number is right" threads |

## Noa, data analyst
| | |
|---|---|
| Goal | Own the meaning of the data and ship changes in batches |
| Pain today | Many small requests. Engineers push back on untested changes |
| A typical day | Reviews the queue, edits descriptions, tests metric changes |
| What Semantix gives | Review queue, analyst-only changes (context, descriptions) that skip engineering, 7-day test, one merge request per batch, YAML import and view publishing |
| Success measure | Share of requests handled without engineering. Merge requests accepted first time |

## Ravi, data engineer
| | |
|---|---|
| Goal | Control what goes live and what agents can reach |
| Pain today | Bottleneck for every change. No audit trail for AI access |
| A typical day | Reviews merge requests, manages access, connects systems |
| What Semantix gives | Merge request list with diff and checks, rollback, People and access tree, Connections and Setup guide, MCP connections with profile, key, test and activity |
| Success measure | Review time per merge request. Zero agents with unreviewed access |

## The AI agent (non-human consumer)
| | |
|---|---|
| Goal | The right definition and SQL, nothing restricted |
| Pain today | Guesses table logic. Sees more data than it should |
| What Semantix gives | One address and key. Only published views, allowed tools, pinned or live version. Definitions and SQL only. Runs the SQL under its own read-only role |
| Success measure | Agent answers match the governed dashboard |
