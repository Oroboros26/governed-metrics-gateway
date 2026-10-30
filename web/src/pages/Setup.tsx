import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRole } from '../lib/role'
import { Banner, PageHeader } from '../components/ui'
import { Icon } from '../components/Icon'

type Step = { id: string; title: string; who: string; body: string; code?: string; lang?: string }
const SNOWFLAKE: Step[] = [
  { id: 'sf0', title: 'How Semantix connects (read this first)', who: 'Everyone', body: 'The Semantix server talks to Snowflake with the Snowflake Python connector (snowflake-connector-python). Two kinds of sign-in, and no password in either:\n\n1. The department key (engineering): key-pair sign-in. The private key stays in your secret store. The connector uses it to create a short-lived signed token for each session. This user only runs schema-information and simple SELECT statements.\n\n2. Analysts: company sign-in (OAuth). Snowflake issues a short-lived access token for that analyst, and the server hands it to the connector. Every query runs as the analyst\'s own role and carries a query tag with their name.\n\nNeither token is ever sent to the browser. Snowflake\'s SQL REST API accepts the same kinds of tokens, so it is an alternative that needs no extra driver. Today your team uses SnowSQL only, so the Python connector would be a new dependency for the Semantix server, and the MVP spec limits dependencies: this needs a decision. The sample below is unverified.', lang: 'Python (sample)', code: `import snowflake.connector\n\n# Department key (engineering): key-pair sign-in\nconn = snowflake.connector.connect(\n    account="<account>", user="SEMANTIX_SVC",\n    private_key=<private key bytes from the secret store>,\n    role="SEMANTIX_READONLY", warehouse="SEMANTIX_XS",\n)\n\n# Analyst: access token from the company sign-in\nconn = snowflake.connector.connect(\n    account="<account>", authenticator="oauth", token=<the analyst's access token>,\n    role="ECOM_ANALYST", warehouse="ANALYST_XS",\n    session_parameters={"QUERY_TAG": "semantix:<analyst>"},\n)` },
  { id: 'sf1', title: 'Decide what Semantix may read', who: 'Data engineering', body: 'Pick the database and schemas that hold the tables your semantic views describe (for example the D2C schema), and a name for the small warehouse that runs the checks. Semantix only needs to read.' },
  { id: 'sf2', title: 'Create a read-only role and a small warehouse', who: 'Snowflake admin', body: 'The role can only read. The warehouse is the smallest size and suspends itself when idle, so checks stay cheap.', lang: 'SQL', code: `CREATE ROLE SEMANTIX_READONLY;\nCREATE WAREHOUSE SEMANTIX_XS WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;\nGRANT USAGE ON WAREHOUSE SEMANTIX_XS TO ROLE SEMANTIX_READONLY;` },
  { id: 'sf3', title: 'Give it read access to those schemas', who: 'Snowflake admin', body: 'Repeat for each schema. Analysts keep their own roles, so what each person sees is still decided by their role, not by this one.', lang: 'SQL', code: `GRANT USAGE ON DATABASE <DATABASE> TO ROLE SEMANTIX_READONLY;\nGRANT USAGE ON SCHEMA <DATABASE>.<SCHEMA> TO ROLE SEMANTIX_READONLY;\nGRANT SELECT ON ALL TABLES IN SCHEMA <DATABASE>.<SCHEMA> TO ROLE SEMANTIX_READONLY;\nGRANT SELECT ON FUTURE TABLES IN SCHEMA <DATABASE>.<SCHEMA> TO ROLE SEMANTIX_READONLY;` },
  { id: 'sf4', title: 'Create the department key', who: 'Data engineering + Snowflake admin', body: 'A key pair lets Semantix sign in as a service user, with no password. Create the pair on a secure machine, keep the private key in your secret store, and give Snowflake the public key.', lang: 'Shell, then SQL', code: `openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out semantix_key.p8 -nocrypt\nopenssl rsa -in semantix_key.p8 -pubout -out semantix_key.pub\n\n-- in Snowflake (paste the public key without its header and footer lines)\nCREATE USER SEMANTIX_SVC DEFAULT_ROLE = SEMANTIX_READONLY DEFAULT_WAREHOUSE = SEMANTIX_XS RSA_PUBLIC_KEY = '<PUBLIC KEY>';\nGRANT ROLE SEMANTIX_READONLY TO USER SEMANTIX_SVC;` },
  { id: 'sf5', title: 'Cap the cost and the run time', who: 'Snowflake admin', body: 'A credit limit and a short time limit protect you from a runaway check.', lang: 'SQL', code: `CREATE RESOURCE MONITOR SEMANTIX_RM WITH CREDIT_QUOTA = 10 TRIGGERS ON 100 PERCENT DO SUSPEND;\nALTER WAREHOUSE SEMANTIX_XS SET RESOURCE_MONITOR = SEMANTIX_RM STATEMENT_TIMEOUT_IN_SECONDS = 120;` },
  { id: 'sf6', title: 'Let analysts sign in with their company account', who: 'Snowflake admin', body: 'Analysts connect as themselves, so they only see what their role allows. This needs a sign-in integration between Snowflake and the Semantix portal. The exact setup depends on your identity provider, so treat this as a starting point and agree it with your admin.', lang: 'SQL (template)', code: `CREATE SECURITY INTEGRATION SEMANTIX_SIGN_IN\n  TYPE = OAUTH\n  OAUTH_CLIENT = CUSTOM\n  OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'\n  OAUTH_REDIRECT_URI = 'https://<your-semantix-portal>/auth/snowflake/callback'\n  ENABLED = TRUE;` },
  { id: 'sf7', title: 'Enter the details in Semantix and test', who: 'Data engineering', body: 'Open Connections, choose Reconnect, add the account, warehouse and key, then run the test. All four checks should pass.' },
]
const GITLAB: Step[] = [
  { id: 'gl1', title: 'Create the repository', who: 'Data engineering', body: 'One project for all semantic views, for example semantic-views. Semantix writes one small YAML file per metric, filter or rule, so two people rarely edit the same file.' },
  { id: 'gl1b', title: 'Create the folders', who: 'Data engineering', body: 'Create this layout in the new repository. Each semantic view has its own folder, and every metric, filter, rule or verified query is its own small file, so two people rarely change the same file. Changes from analysts only ever touch files under views/<view>/. The access folder, the pipeline and CODEOWNERS are for engineering only.', lang: 'Folder layout', code: `semantic-views/\n├── views/\n│   ├── d2c/\n│   │   ├── view.yaml             name, description, owner\n│   │   ├── relationships.yaml    how the tables join\n│   │   ├── tables/               one file per table, with its fields and descriptions\n│   │   ├── metrics/              one file per metric\n│   │   ├── filters/              one file per ready-made filter\n│   │   ├── rules/                one file per rule\n│   │   ├── verified_queries/     one file per verified query\n│   │   └── context/              business context blocks and the glossary\n│   ├── finance/                  same layout for every view\n│   └── wholesale/\n├── access/\n│   └── people.yaml               who works with which view (engineering only)\n├── .gitlab-ci.yml                checks and deploy\n├── CODEOWNERS                    who must review what\n└── README.md` },
  { id: 'gl2', title: 'Protect the main branch', who: 'Data engineering', body: 'In the project settings, allow changes to main only through merge requests, require at least one approval, and turn off direct pushes. Then nothing goes live without an engineer.' },
  { id: 'gl3', title: 'Name who reviews what', who: 'Data engineering', body: 'A CODEOWNERS file makes sure merge requests that touch the views are reviewed by your team.', lang: 'CODEOWNERS', code: `/views/            @<your-data-engineering-group>\n/access/           @<your-data-engineering-group>\n/.gitlab-ci.yml   @<your-data-engineering-group>` },
  { id: 'gl4', title: 'Create an access token for Semantix', who: 'Data engineering', body: 'Semantix needs a token to open merge requests for the analysts and to read their status. Create a project access token with the Developer role and the api scope, store it in your secret store, and give it to the Semantix server. It is never placed in the browser. Analysts do not need GitLab accounts: the merge request shows them as the author in its description.' },
  { id: 'gl5', title: 'Add the check and deploy pipeline', who: 'Data engineering', body: 'The pipeline checks every merge request (file structure, no circular dependencies, SQL compiles) and deploys after a merge. The semantix command below is a placeholder: it does not exist yet in this prototype.', lang: '.gitlab-ci.yml (sample)', code: `stages: [validate, deploy]\n\nvalidate:\n  stage: validate\n  image: python:3.12-slim\n  script:\n    - pip install semantix-cli   # placeholder\n    - semantix validate views/\n\ndeploy:\n  stage: deploy\n  rules:\n    - if: '$CI_COMMIT_BRANCH == "main"'\n  script:\n    - semantix deploy views/     # placeholder` },
  { id: 'gl6', title: 'Tell Semantix when something is merged', who: 'Data engineering', body: 'Add a webhook so the portal shows the real status: merge request events and pipeline events, with a secret token that Semantix checks.', lang: 'Webhook', code: `URL:      https://<your-semantix-portal>/hooks/gitlab\nTriggers: Merge request events, Pipeline events\nSecret:   <a long random value, also given to Semantix>` },
  { id: 'gl7', title: 'Enter the details in Semantix and test', who: 'Data engineering', body: 'Open Connections, enter the project path and token, and run the test. It checks the token, opens a test merge request, and confirms the webhook arrives.' },
]
const ANALYST: Step[] = [
  { id: 'an1', title: 'Ask engineering for your warehouse role', who: 'You', body: 'Your role decides which tables you see, and which tables your business users can be given. If you already query Snowflake today, you have one.' },
  { id: 'an2', title: 'Sign in with your company account', who: 'You', body: 'Open Warehouse, choose Connect, and sign in. Semantix never sees your password.' },
  { id: 'an3', title: 'Run the test', who: 'You', body: 'Four quick checks confirm that you can reach the warehouse and read your tables. Then your tables appear in the list.' },
]

function Code({ code, lang }: { code: string; lang?: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900"><span className="type-muted">{lang}</span>
        <button className="btn btn-ghost !px-2 !py-0.5 text-xs" onClick={() => { try { navigator.clipboard.writeText(code).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }) } catch { /* not copied */ } }}>{done ? 'Copied' : 'Copy'}</button></div>
      <pre className="type-mono overflow-x-auto p-3">{code}</pre>
    </div>
  )
}

export default function Setup() {
  const { role } = useRole()
  const tabs = role === 'engineer' ? [['sf', 'Snowflake', SNOWFLAKE], ['gl', 'GitLab', GITLAB]] as const : [['an', 'Connect as an analyst', ANALYST]] as const
  const [tab, setTab] = useState<string>(tabs[0][0])
  const steps = (tabs.find((t) => t[0] === tab) ?? tabs[0])[2]
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('sx-setup') ?? '{}') } catch { return {} } })
  const [open, setOpen] = useState<string | null>(steps[0].id)
  const mark = (id: string) => { const n = { ...done, [id]: !done[id] }; setDone(n); try { localStorage.setItem('sx-setup', JSON.stringify(n)) } catch { /* not saved */ } }
  const n = steps.filter((s) => done[s.id]).length
  return (
    <>
      <PageHeader title="Setup guide" sub={role === 'engineer' ? 'What to create in Snowflake and GitLab so Semantix can work. Data engineering does this once.' : 'How to connect to the warehouse. It takes a few minutes.'} action={<Link to="/app/warehouse" className="btn btn-outline">Go to {role === 'engineer' ? 'Connections' : 'Warehouse'}</Link>} />
      {role === 'engineer' && <div className="mb-4"><Banner kind="warn">These are templates. Names, options and the sign-in setup must be checked by your Snowflake and GitLab administrators: I have not verified them against your environment.</Banner></div>}
      {tabs.length > 1 && <div role="tablist" className="mb-4 flex gap-1.5">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpen(null) }} className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l}</button>)}</div>}
      <div className="mb-3 flex items-center gap-3"><div className="h-1.5 w-48 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="img" aria-label={`${n} of ${steps.length} steps done`}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(n / steps.length) * 100}%` }} /></div><span className="type-muted">{n} of {steps.length} steps done</span></div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.id} className="card !p-0">
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${done[s.id] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}>{done[s.id] ? '✓' : i + 1}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{s.title}</span><span className="type-muted">{s.who}</span></span>
              <Icon name="chevron" className={`h-4 w-4 transition-transform ${open === s.id ? '' : '-rotate-90'}`} />
            </button>
            {open === s.id && <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800"><div className="space-y-2 text-sm">{s.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>{s.code && <Code code={s.code} lang={s.lang} />}
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!done[s.id]} onChange={() => mark(s.id)} /> Mark as done</label></div>}
          </li>
        ))}
      </ol>
    </>
  )
}
