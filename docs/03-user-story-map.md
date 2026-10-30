# User story map: one change, end to end

**Scenario:** the "net revenue" filter should exclude returned orders.

```
Jean            Noa                  Ravi                 Agent
request  ──►  review + 7-day  ──►  review diff,   ──►  asks a question,
(plain text)   test, batch into     approve + merge      gets the new
               one merge request    (live, rollback)     definition
```

| # | Who | Action | Prototype screen | Result |
|---|---|---|---|---|
| 1 | Jean | Suggests a change on a filter | Filters, "Suggest a change", "Send for review" | Change enters the queue |
| 2 | Jean | Follows it | My Changes | Status: requested |
| 3 | Noa | Opens the queue and selects changes | Review queue | Sees all requests |
| 4 | Noa | Runs the 7-day test | "Run 7-day test" | Tested badge |
| 5 | Noa | Groups tested changes | "Create one merge request", "Submit to engineering" | One merge request opens |
| 6 | Ravi | Reads the diff and checks | Merge requests, open one | Sees what changes |
| 7 | Ravi | Approves | "Approve and merge" | Live, recorded in the repository |
| 8 | Agent | Asks a question over MCP | MCP, connection "Test" tab | Gets the new definition |

**Two tiers:** analyst-only changes (context, descriptions) go live after Noa approves. Engineering changes (metrics, filters, rules, verified queries, new views) need a merge request.

**Accountability:** each step is recorded with who and when. **Security:** restricted fields are never sent to the agent.

**Prototype caveat:** the steps run on mock data in the browser. GitLab and Snowflake are simulated.
