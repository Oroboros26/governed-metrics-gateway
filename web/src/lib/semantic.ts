import { getStored } from './store'
// Prototype data for the semantic view. Hand-written from the general structure of a Snowflake semantic view
// (tables, fields, ready-made filters, rules, verified questions, joins). No consumer data, no sample values.
// Same shape as the YAML, so a loader for the real (cleaned) file can replace this later.

export type FieldKind = 'slice' | 'number' | 'date' | 'kpi'
export type Field = { name: string; kind: FieldKind; type: string; description?: string; synonyms?: string[]; restricted?: boolean }
export type SemTable = {
  id: string; label: string; role: 'fact' | 'dimension'; group: string
  description: string; source: string; fields: Field[]
}
export type SemFilter = { id: string; label: string; group: 'Region' | 'Channel' | 'Segment' | 'Period' | 'Other'; meaning: string; table: string; synonyms: string[] }
export type Rule = { id: string; title: string; topic: string; body: string }
export type Question = { id: string; text: string; topic: string; by: string; at: string; sql: string }
export type Join = { from: string; to: string; on: string }
export type SemanticView = {
  name: string; description: string; answers: string[]; doesNotAnswer: string[]
  tables: SemTable[]; filters: SemFilter[]; rules: Rule[]; questions: Question[]; joins: Join[]
}

export const KIND_LABEL: Record<FieldKind, string> = { slice: 'Way to slice', number: 'Number', date: 'Date', kpi: 'KPI' }
export const label = (n: string) => { const s = n.toLowerCase().replaceAll('_', ' '); return s[0].toUpperCase() + s.slice(1) }

const f = (name: string, kind: FieldKind, type: string, description?: string, extra: Partial<Field> = {}): Field => ({ name, kind, type, description, ...extra })
const S = (n: string, d?: string, e?: Partial<Field>) => f(n, 'slice', 'Text', d, e)
const N = (n: string, d?: string, e?: Partial<Field>) => f(n, 'number', 'Number', d, e)
const D = (n: string, d?: string) => f(n, 'date', 'Date', d)
const K = (n: string, d?: string, e?: Partial<Field>) => f(n, 'kpi', 'KPI', d, e)

const ATTRS = ['accessories', 'activities', 'activity_duration', 'adjustability', 'ankle_strap', 'back_system', 'bag_construction', 'base_material', 'basket', 'benefit_1', 'benefit_2', 'benefit_3',
  'binding_system', 'board_profile', 'boot_shell', 'breathability', 'business_unit', 'care', 'claim', 'color_callout', 'color_group_1', 'comfort', 'composition', 'compression', 'cushioning',
  'description', 'fit', 'flex', 'goods_type', 'grip', 'insulation', 'lacing_system', 'lens_technology', 'level_of_practice', 'lining', 'made_in', 'material', 'midsole',
  'norms_and_certifications', 'outsole', 'padding', 'primary_practice', 'product_type', 'rental', 'safety', 'sustainability', 'terrain', 'ventilation', 'waterproofness', 'weather_condition']
const UNDOCUMENTED_ATTRS = ['weight_g', 'volume_l', 'drop_mm', 'lens_height_mm', 'frame_width_mm', 'waterproofing_mm', 'lug_depth_mm', 'temple_length_mm']

export const SEMANTIC: SemanticView = {
  name: 'D2C Semantic View',
  description: 'Direct-to-consumer sales for the e-commerce and retail channels: orders, returns, products, shops and consumers. It is not powered by the finance system and should not be treated as financial reporting. Results follow your role and region.',
  answers: ['Sales, units and order value by channel, country and period', 'Returns and refunds', 'Products, product lines and families', 'Shops and shop traffic', 'Consumer segments (as counts and shares)'],
  doesNotAnswer: ['Anything about an individual consumer', 'Margins or costs (not in this model)', 'Official financial results'],
  tables: [
    {
      id: 'orders', label: 'Order lines', role: 'fact', group: 'Orders and traffic', source: 'ANALYTIC_F_ORDER_LINES',
      description: 'One row per item in an order, across e-commerce, retail, endless aisle and phone sales, with its price, discount, shipment and refund.',
      fields: [
        S('order_sales_channel', 'Where the sale happened: retail, e-commerce, endless aisle or phone sale.'), S('order_country', 'Country where the order was created.'), S('order_region', 'Region where the order was created (EMEA, NAM, APAC).'),
        S('consumer_segment', 'D2C for final consumers, D2X for partners and professionals.'), S('order_status', 'Status of the order. Blank for normal retail sales.'), S('payment_method', 'How the order was paid.'),
        S('shipping_method'), S('item_name', 'Name of the item.'), S('item_sku', 'SKU of the item.'), S('item_promotion_name', 'Description of the promotion applied to the item.'), S('return_reason', 'Why the item was returned.'),
        S('checkout_method', 'Terminal or system used at the point of sale (retail only).'), S('is_consumer_guest', 'True when the buyer has no account.'),
        S('account_uuid', 'Identifier of the buyer account.', { restricted: true }), S('shipping_street_address', 'Delivery address.', { restricted: true }), S('shipping_zip_code', 'Delivery zip code.', { restricted: true }),
        S('shipping_address_phone', 'Delivery phone.', { restricted: true }),
        N('item_quantity', 'Quantity of the same item in the order line.'), N('item_final_price_tax_excluded_eur', 'What the customer paid for the item after discounts, without tax, in euros.'),
        N('item_final_price_tax_included_eur', 'What the customer paid for the item after discounts, with tax, in euros.'), N('item_discount_rate', 'Coupon or promotion discount rate on the item.'),
        N('item_unit_srp_tax_excluded_eur', 'Suggested retail price per unit, without tax, in euros.'), N('returned_quantity', 'Quantity of items returned.'), N('total_amount_refunded_tax_excluded_eur', 'Total refunded without tax, in euros.'),
        N('order_tax_rate'),
        D('order_created_at', 'When the order was created.'), D('shipment_created_at', 'When the shipment was created.'), D('refund_created_at', 'When the refund was created.'), D('invoice_created_at'),
        K('total_revenue_eur_taxexcl', 'Total revenue in euros, without tax, after discounts.'), K('gross_sales_tax_included_eur', 'Total gross sales in euros, with tax.'),
        K('net_sales_tax_excluded_eur', 'Gross sales minus refunds, in euros, without tax.'), K('return_rate_percentage', 'Returned units as a percentage of ordered units.'),
        K('average_order_value_usd', 'Average value of an order, in US dollars.', { synonyms: ['aov', 'basket size'] }), K('units_per_transaction', 'Average number of items per order.', { synonyms: ['upt'] }),
        K('distinct_order_count', 'Number of unique orders.', { synonyms: ['order volume'] }),
      ],
    },
    {
      id: 'traffic', label: 'Shop traffic (daily)', role: 'fact', group: 'Orders and traffic', source: 'ANALYTIC_F_SHOP_TRAFFIC_DAILY',
      description: 'Daily visitor counts per shop from cameras and door counters.',
      fields: [S('shop_id'), S('bi_shop_id'), S('shop_country'), S('region'), S('traffic_channel'), N('sum_traffic'), N('sum_camera_visits'), N('sum_camera_walkbys'), N('sum_camera_bounces'), N('sum_window_count'), N('max_camera_occupancy'), D('traffic_date')],
    },
    {
      id: 'mart', label: 'Traffic and tickets summary', role: 'fact', group: 'Orders and traffic', source: 'MART_TRAFFIC_DAILY',
      description: 'Daily traffic together with the number of tickets (orders) per shop, for conversion analysis. Covers retail and e-commerce.',
      fields: [
        S('shop_id', 'Unique identifier of the shop.'), S('consumer_segment', 'Consumer segment of the orders.'), S('order_sales_channel', 'Sales channel of the orders.'), S('shop_country', 'Country of the shop.'),
        N('sum_traffic', 'Traffic of the day, for e-commerce and retail.'), N('count_distinct_tickets', 'Number of distinct orders for that day and shop.'), N('count_orders_without_returns', 'Number of orders excluding returns.'),
        D('traffic_date', 'Date at which traffic and tickets are measured.'), K('total_tickets', 'Total tickets across dates and shops.'), K('total_orders_without_returns', 'Total orders excluding returns.'),
      ],
    },
    {
      id: 'plm', label: 'Products (hierarchy)', role: 'dimension', group: 'Product, shop, consumer', source: 'ANALYTIC_D_ARTICLE_PLM',
      description: 'One row per article with its place in the product hierarchy: business area, category, product line, family, franchise, gender, price level and season.',
      fields: [
        S('article_code', 'Code of the product article.'), S('article_name', 'Name of the article.'), S('article_business_area_name', 'Top-level grouping, such as footwear or apparel.'), S('article_category_name', 'Category of the article.'),
        S('article_ph_name_4', 'Product line (hierarchy level 4). Not the same as business area.'), S('article_ph_name_6', 'Family (hierarchy level 6), below product line.'), S('model_franchise', 'Franchise: a series of products sharing the same concept.'),
        S('model_gender', 'Gender the product is made for.'), S('model_segment', 'Performance or Sportstyle, grouped by marketing.'), S('model_price_level', 'Good, Better or Best, based on cost and perceived value.'),
        S('article_color_1', 'First main color of the article.'), S('article_season'), S('model_commercial_name', 'Marketing name of the product.'), S('article_status'),
        N('model_price', 'Suggested consumer price in euros.'), D('article_creation_date', 'Date the article was created.'), D('article_modification_date', 'Most recent change to the article.'),
      ],
    },
    {
      id: 'attrs', label: 'Product attributes', role: 'dimension', group: 'Product, shop, consumer', source: 'ANALYTIC_D_ARTICLE_PIM_SALSIFY',
      description: 'Detailed marketing attributes per article and language: materials, technologies, features and benefits. Always filter on one language to avoid duplicate rows.',
      fields: [
        S('article_code', 'Article code of the product.'), S('language_code', 'Language used in the descriptions.'),
        ...ATTRS.map((a) => S(a, `${label(a)} of the product, from the product information system.`)),
        ...UNDOCUMENTED_ATTRS.map((a) => S(a)),
      ],
    },
    {
      id: 'shop', label: 'Shops', role: 'dimension', group: 'Product, shop, consumer', source: 'ANALYTIC_D_SHOP',
      description: 'One row per shop, across channels and brands, with its location, format, dates of operation and area.',
      fields: [
        S('shop_id', 'Unique identifier of the shop.'), S('shop_name', 'Official name of the shop.'), S('country_name', 'Country of the shop.'), S('city', 'City of the shop.'), S('channel', 'Retail, e-commerce or endless aisle.'),
        S('format', 'Business model: D2C or D2X for e-commerce, store format for retail.'), S('brand', 'Brand of the shop.'), S('region_rap', 'Region used for access rules, based on the country.'),
        S('epicenter_name', 'Commercial hub the retail shop belongs to.'), S('timezone'), S('pos_system'), N('sales_area', 'Square meters dedicated to sales (retail only).'), N('total_area', 'Total square meters of the location (retail only).'),
        D('opening_date', 'First day of operation.'), D('closing_date', 'Last day of operation, if closed.'), D('refit_start_date', 'Start of the renovation period.'), D('refit_end_date', 'End of the renovation period.'),
      ],
    },
    {
      id: 'consumer', label: 'Consumers', role: 'dimension', group: 'Product, shop, consumer', source: 'ANALYTIC_D_USER',
      description: 'One row per consumer account with segment, loyalty status and value. Use it for counts and shares, never for individual lookups.',
      fields: [
        S('consumer_segment', 'D2C or D2X.'), S('gender', 'Gender of the consumer.'), S('age_bracket', 'Age group, such as 16-25 or 26-35.'), S('consumer_country_name', 'Country of the consumer.'), S('region', 'Region of the consumer.'),
        S('is_splus_member', 'True when the consumer is a loyalty member.'), S('splus_status', 'Loyalty tier of the consumer.'), S('optin_marketing', 'Whether the consumer agreed to marketing messages.'), S('latest_value_segment', 'Value segment based on spend over the last 20 months.'),
        S('pref_sport', 'Sports the consumer is interested in.'), S('consumer_cluster_name', 'Cluster from the consumer clustering model.'),
        S('account_uuid', 'Identifier of the consumer account.', { restricted: true }), S('birthdate', 'Date of birth.', { restricted: true }), S('address_city', 'City of the consumer address.', { restricted: true }),
        N('net_consumer_value_total', 'Net amount spent in euros over the full history.'), N('gross_aov_total', 'Average gross order value in euros over the full history.'), N('loyalty_points_available'),
        D('account_created_at', 'When the account was created.'), D('membership_created_at', 'When the consumer joined the loyalty program.'),
        K('consumer_count', 'Number of unique consumers, excluding test accounts.', { synonyms: ['customer count'] }), K('distinct_consumer_count', 'Number of unique consumer accounts.'),
      ],
    },
  ],
  filters: [
    { id: 'f1', label: 'D2C consumers only', group: 'Segment', meaning: 'Keeps only orders from final consumers. Leaves out partners, employees and professionals.', table: 'orders', synonyms: ['direct consumers'] },
    { id: 'f2', label: 'D2C and D2X', group: 'Segment', meaning: 'Keeps final consumers and partner or experience customers together.', table: 'orders', synonyms: [] },
    { id: 'f3', label: 'Performance products only', group: 'Segment', meaning: 'Keeps products classified as Performance.', table: 'plm', synonyms: ['technical segment'] },
    { id: 'f4', label: 'Sportstyle products only', group: 'Segment', meaning: 'Keeps products classified as Sportstyle.', table: 'plm', synonyms: ['lifestyle segment'] },
    { id: 'f5', label: 'EMEA only', group: 'Region', meaning: 'Keeps orders from Europe, Middle East and Africa.', table: 'orders', synonyms: ['europe'] },
    { id: 'f6', label: 'EMEA and North America', group: 'Region', meaning: 'Keeps orders from the two main regions.', table: 'orders', synonyms: ['western markets'] },
    { id: 'f7', label: 'France orders only', group: 'Region', meaning: 'Keeps orders placed in France.', table: 'orders', synonyms: ['french orders'] },
    { id: 'f8', label: 'Retail channel only', group: 'Channel', meaning: 'Keeps in-store orders. In EMEA, endless aisle is counted as retail (see Rules).', table: 'orders', synonyms: ['in-store'] },
    { id: 'f9', label: 'D2C retail and e-commerce', group: 'Channel', meaning: 'Keeps D2C orders from stores and e-commerce. Leaves out endless aisle and phone sales.', table: 'orders', synonyms: [] },
    { id: 'f10', label: 'Completed orders only', group: 'Other', meaning: 'Keeps finished orders. Leaves out cancelled, pending and in-progress ones.', table: 'orders', synonyms: ['finalized orders'] },
    { id: 'f11', label: 'E-commerce, last 12 months', group: 'Period', meaning: 'Keeps e-commerce orders from the last 12 months, up to but not including today.', table: 'orders', synonyms: ['rolling year'] },
    { id: 'f12', label: 'Paris epicenter shops', group: 'Other', meaning: 'Keeps shops inside the Paris commercial hub.', table: 'shop', synonyms: ['paris stores'] },
  ],
  rules: [
    { id: 'r1', title: 'How return rate is calculated', topic: 'Returns', body: 'Return rate = returned units ÷ ordered units × 100. It is calculated on order lines, so it can be cut by channel, region, segment or product.' },
    { id: 'r2', title: 'EMEA retail includes endless aisle', topic: 'Channels', body: 'When you ask about retail in EMEA, endless aisle orders are included. In EMEA they are managed as part of retail. Retail alone would understate it.' },
    { id: 'r3', title: 'Markdown, coupon and total discount are different', topic: 'Pricing', body: 'Markdown is the base price below the suggested retail price, set by merchandising. A coupon is an extra discount at the till. "% off" for a consumer is measured against the suggested price. The discount-rate field only captures coupons.' },
    { id: 'r4', title: 'Comparing a week with the same week last year', topic: 'Periods', body: 'By default we go back exactly 364 days, so Monday is compared with Monday. We only use the same week number if you ask for it.' },
    { id: 'r5', title: 'Dates follow Paris time', topic: 'Periods', body: 'Day and week boundaries use Paris time, to match the Power BI reports. An order late on Sunday in UTC counts on Monday.' },
    { id: 'r6', title: 'Retail orders have no status', topic: 'Data quality', body: 'Normal retail sales have a blank order status. Filtering out "cancelled" must keep blanks, or most retail sales disappear.' },
    { id: 'r7', title: 'D2C vs D2X', topic: 'Segments', body: 'D2C are final consumers. D2X are partners and professionals. Consumer questions use D2C, with both retail and e-commerce, unless told otherwise.' },
    { id: 'r8', title: 'Guests and matched consumers', topic: 'Data quality', body: 'Guest orders have no account. They stay in by default and are left out only for consumer analyses, such as demographics or repeat rates, when you ask.' },
    { id: 'r9', title: 'When a detail is missing we ask', topic: 'Questions', body: 'If period, customer type, region, channel, product, currency or tax treatment is missing, we ask before giving a number, so two people asking the same thing get the same answer.' },
  ],
  questions: [
    { id: 'q1', text: 'Total order amount in euros for a country and month, all channels', topic: 'Sales', by: 'Data team', at: 'Feb 2026', sql: "select sum(item_final_price_tax_excluded_eur) as total_order_amount_eur\nfrom analytic_f_order_lines\nwhere order_country = 'FR'\n  and order_created_at >= dateadd(month, -1, date_trunc('month', current_date))\n  and order_created_at < date_trunc('month', current_date)" },
    { id: 'q2', text: 'Gross and net turnover for e-commerce in a region over the past year', topic: 'Sales', by: 'Data team', at: 'Mar 2026', sql: "select sum(item_final_price_tax_excluded_eur) as gross_eur\n  , sum(item_final_price_tax_excluded_eur) - sum(total_amount_refunded_tax_excluded_eur) as net_eur\nfrom analytic_f_order_lines\nwhere order_sales_channel = 'ecommerce'\n  and order_region = 'EMEA'" },
    { id: 'q3', text: 'Weekly e-commerce KPIs (sales, units, orders, AOV, ASP, UPT) for the last 4 weeks', topic: 'Sales', by: 'Data team', at: 'Apr 2026', sql: "with weekly as (\n  select date_trunc('week', order_created_at) as week_start\n    , sum(item_final_price_tax_excluded_eur) as sales\n    , sum(item_quantity) as units\n    , count(distinct order_uuid) as orders\n  from analytic_f_order_lines\n  group by 1\n)\nselect week_start, sales, units, orders\n  , sales / nullif(orders, 0) as aov\nfrom weekly" },
    { id: 'q4', text: 'Gross sales for e-commerce in EMEA: this week against the same week last year', topic: 'Sales', by: 'Data team', at: 'Apr 2026', sql: '-- compares this week with the same weekday-aligned week 364 days earlier\nselect 1' },
    { id: 'q5', text: 'Top 10 products by gross sales last month', topic: 'Products', by: 'Data team', at: 'May 2026', sql: "select item_material, item_name\n  , sum(item_final_price_tax_excluded_eur) as gross_sales_eur\nfrom analytic_f_order_lines\ngroup by 1, 2\norder by 3 desc\nlimit 10" },
    { id: 'q6', text: 'Orders and units by country for a product model over a period', topic: 'Products', by: 'Data team', at: 'May 2026', sql: 'select order_country\n  , count(distinct order_uuid) as orders\n  , sum(item_quantity) as units\nfrom analytic_f_order_lines\ngroup by 1\norder by 2 desc' },
    { id: 'q7', text: 'Return rate for a product model over a period', topic: 'Returns', by: 'Data team', at: 'May 2026', sql: 'select sum(returned_quantity) / nullif(sum(item_quantity), 0) * 100 as return_rate_pct\nfrom analytic_f_order_lines' },
    { id: 'q8', text: 'Full-price share of business for D2C', topic: 'Pricing', by: 'Data team', at: 'Jun 2026', sql: "select sum(case when item_unit_price_tax_excluded_eur = item_unit_srp_tax_excluded_eur\n    and item_discount_rate_eur = 0 then item_final_price_tax_excluded_eur else 0 end)\n  / nullif(sum(item_final_price_tax_excluded_eur), 0) as full_price_share\nfrom analytic_f_order_lines\nwhere consumer_segment = 'D2C'" },
    { id: 'q9', text: 'Share of Sportstyle and Performance consumers, and how it changed over the years', topic: 'Consumers', by: 'Data team', at: 'Jun 2026', sql: '-- groups consumers by what they bought and compares shares per year\nselect 1' },
    { id: 'q10', text: 'New customers by channel for a region and month', topic: 'Consumers', by: 'Data team', at: 'Jul 2026', sql: "select order_sales_channel\n  , count(distinct account_uuid) as new_consumers\nfrom analytic_f_order_lines\ngroup by 1" },
    { id: 'q11', text: 'Revenue split between loyalty members and guests for the past year', topic: 'Consumers', by: 'Data team', at: 'Aug 2026', sql: '-- members and guests, aligned with the CRM Power BI report\nselect 1' },
    { id: 'q12', text: 'Sales for one store last Saturday, tax included and excluded', topic: 'Shops', by: 'Data team', at: 'Sep 2026', sql: 'select sum(item_final_price_tax_included_eur) as gross_ttc\n  , sum(item_final_price_tax_excluded_eur) as gross_ht\nfrom analytic_f_order_lines' },
  ],
  joins: [
    { from: 'orders', to: 'shop', on: 'shop' }, { from: 'orders', to: 'consumer', on: 'consumer account' }, { from: 'orders', to: 'plm', on: 'article code' },
    { from: 'traffic', to: 'shop', on: 'shop' }, { from: 'mart', to: 'shop', on: 'shop' }, { from: 'consumer', to: 'shop', on: 'membership shop' },
  ],
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
export const getSemanticView = async (viewId = 'd2c'): Promise<SemanticView | null> => { await sleep(450); return viewId === 'd2c' ? SEMANTIC : getStored(viewId)?.semantic ?? null }

export const isRestricted = (f: Field) => !!f.restricted
export function coverage(fields: Field[]) {
  const total = fields.length, doc = fields.filter((x) => x.description).length
  return { total, documented: doc, pct: total ? Math.round((doc / total) * 100) : 100 }
}
