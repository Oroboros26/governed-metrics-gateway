import { getStored } from './store'
// Sample business context, written in everyday language so people and AI agents read the same thing.
export type CtxSection = { id: string; title: string; body: string }
export type GlossaryItem = { term: string; meaning: string }

export type ViewContext = { sections: CtxSection[]; glossary: GlossaryItem[] }
// Each semantic view has its own blocks and glossary. Only D2C has sample text.
export const SUGGESTED_BLOCKS = ['What we do', 'How we sell', 'Who our customers are', 'What the AI should not answer', 'Seasons and calendar', 'Data caveats']
const D2C: ViewContext = {
  sections: [
    { id: 'what', title: 'What we do', body: 'We design and sell outdoor and sport products. This view covers what we sell directly to consumers, online and in our own shops.' },
    { id: 'sell', title: 'How we sell', body: 'We sell through three channels: e-commerce (our websites), retail (our own shops) and endless aisle (ordering in a shop for home delivery). Phone sales are rare. In Europe, endless aisle counts as retail.' },
    { id: 'customers', title: 'Who our customers are', body: 'D2C are final consumers who buy from us. D2X are partners, employees and professionals. Unless someone says otherwise, a question about consumers means D2C.' },
    { id: 'out', title: 'What the AI should not answer', body: 'Anything about an individual consumer. Margins and costs. Official financial results.' },
  ],
  glossary: [
    { term: 'D2C', meaning: 'Direct to consumer: sales to final consumers.' },
    { term: 'D2X', meaning: 'Sales to partners, employees and professionals through our own channels.' },
    { term: 'EOSS', meaning: 'End of sales season: the base price is reduced below the suggested retail price.' },
    { term: 'LTD', meaning: 'Launch to date: everything since the product was first sold.' },
    { term: 'AOV', meaning: 'Average order value: sales divided by the number of orders.' },
    { term: 'ASP', meaning: 'Average selling price: sales divided by the number of units.' },
    { term: 'UPT', meaning: 'Units per transaction: units divided by the number of orders.' },
    { term: 'SRP', meaning: 'Suggested retail price.' },
    { term: 'Endless aisle', meaning: 'An order placed in a shop for delivery to the customer.' },
  ],
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
export const getContext = async (view: string): Promise<ViewContext> => { await sleep(350); return view === 'd2c' ? D2C : getStored(view)?.context ?? { sections: [], glossary: [] } }
export const D2C_CONTEXT = D2C
