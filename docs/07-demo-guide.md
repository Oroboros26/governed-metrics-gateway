# Prototype demo guide

Start: `cd web && npm run dev`, open http://127.0.0.1:5173/. Labels below come from the code. I have **not** run the click path in a browser, so rehearse it once.

**Before you start:** user menu (bottom left) → *Reset demo data*. Switch profile any time from the same menu: *Switch role (demo)*.

## 1. Landing and login (20 s)
1. Show the landing page, then open the login page.
2. Point at the three persona cards. Pick **Jean**.

## 2. Jean, business user (about 90 s)
1. Opens at D2C Overview. Show the diagram of tables.
2. Sidebar: **Business context**, then **Metrics**. Open one metric and read the plain definition.
3. Sidebar: **Filters**. Click **Suggest a change** on a card, type the reason, click **Send for review**.
4. Open **My Changes**. Show the new item with its status.
5. Say: "No SQL, and she always knows where it is."

## 3. Noa, data analyst (about 120 s)
1. Switch role to **Noa**. Opens at **Review queue**.
2. Select Jean's change plus one or two others.
3. On an engineering change, click **Run 7-day test**. Wait for the tested badge. Use **See changes** to show the diff.
4. Click **Create one merge request**, type a title, click **Submit to engineering**.
5. Optional: **My team** and the YAML import (Semantic Layer → All views).
6. Say: "One batch instead of a ticket per change."

## 4. Ravi, data engineer (about 120 s)
1. Switch role to **Ravi**. Opens at **Overview**.
2. **Merge requests**, open the new one. Show diff and checks. Say the checks are samples in the prototype.
3. Click **Approve and merge**. Show "Merged... live and recorded in the repository".
4. **MCP**: show the endpoint, then **Create a connection** (pick views, tools, limits). Open the **Test** tab and run it. Show "What the agent receives".
5. Optional: **People and access** (collapsible tree), **Repository**, **Connections**, **Setup guide**.
6. Say: "The agent gets definitions and SQL, never data."

## Do not click or claim
- **Connections** (Snowflake, GitLab) are simulated wizards. Do not say they are connected.
- The MR checks are sample checks. The 7-day test in the UI is simulated.
- Nothing talks to the FastAPI backend. All state is in browser storage.
- If something looks stuck: *Reset demo data*, or refresh.
- The notifications bell and OAuth sign-in are not built.
