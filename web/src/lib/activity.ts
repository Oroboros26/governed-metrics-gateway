// Sample activity for the D2C view. Pending items from "My Changes" are added on top in the page.
export type Activity = { id: string; when: string; who: string; what: string; where: string; kind: 'metric' | 'description' | 'rule' | 'filter' | 'query' | 'context' }
export const ACTIVITY: Activity[] = [
  { id: 'a1', when: '21 Oct 2026', who: 'Data Platform', what: 'Refreshed the view from the warehouse', where: 'Whole view', kind: 'description' },
  { id: 'a2', when: '14 Oct 2026', who: 'Jean', what: 'Added the filter "D2C retail and e-commerce"', where: 'Filters', kind: 'filter' },
  { id: 'a3', when: '3 Oct 2026', who: 'Data Platform', what: 'Gross revenue now uses price × quantity per order line', where: 'Metrics › Gross revenue', kind: 'metric' },
  { id: 'a4', when: '22 Sep 2026', who: 'Data team', what: 'Verified the query "Sales for one store last Saturday"', where: 'Verified queries', kind: 'query' },
  { id: 'a5', when: '9 Sep 2026', who: 'Jean', what: 'Clarified the rule "D2C vs D2X"', where: 'Rules', kind: 'rule' },
  { id: 'a6', when: '14 Aug 2026', who: 'Jean', what: 'Clarified the description of Gross revenue', where: 'Metrics › Gross revenue', kind: 'metric' },
]
