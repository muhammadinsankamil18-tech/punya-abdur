// Validates and fills in defaults for directory.json.
// Used by build.mjs and dev.mjs.
//
// Anything optional is filled in here, so a hand-written entry can be as small as:
//   { "title": "Auto Top-up", "url": "https://www.figma.com/design/…", "design": "progress", "updated": "2026-11-14" }

export const DESIGN = ['draft', 'progress', 'review', 'validating', 'approved', 'ready', 'hold', 'deprecated'];
export const DELIVERY = ['none', 'handed', 'dev', 'qa', 'release', 'released', 'iterating'];
export const BRAND_STATUS = ['not_shared', 'shared', 'progress', 'submitted', 'audit', 'aligned', 'outdated'];
export const BRANDS = ['xl', 'axis', 'sf'];
export const DEFAULT_URL = 'https://www.figma.com/';

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

export const slug = s =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, ' ').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

const emptyBrand = () => ({
  status: 'not_shared', sharedDate: '', figmaUrl: '', blueprint: '', owner: '',
  lastAudit: '', auditNotes: '', auditLink: '', targetRelease: '', meta: null,
});

/**
 * @param {unknown} raw parsed JSON
 * @returns {{ data: any[], errors: string[], warnings: string[] }}
 */
export function normalize(raw) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(raw)) {
    return { data: [], errors: ['The file must be a JSON array of journeys: [ { "id": "A", "name": "…", "groups": [ … ] } ]'], warnings };
  }

  const journeyIds = new Set();
  const groupIds = new Set();
  const linkIds = new Set();
  const unique = (set, base) => { let id = base, n = 2; while (set.has(id)) id = `${base}-${n++}`; set.add(id); return id; };

  const data = raw.map((j, ji) => {
    const jWhere = `journey #${ji + 1}${j && j.name ? ` ("${j.name}")` : ''}`;
    if (!j || typeof j !== 'object') { errors.push(`${jWhere}: must be an object`); return null; }
    if (!j.id || typeof j.id !== 'string') errors.push(`${jWhere}: "id" is required (a short letter like "A")`);
    else if (journeyIds.has(j.id)) errors.push(`${jWhere}: id "${j.id}" is used by another journey`);
    else journeyIds.add(j.id);
    if (!j.name || typeof j.name !== 'string') errors.push(`${jWhere}: "name" is required`);
    if (!Array.isArray(j.groups)) { errors.push(`${jWhere}: "groups" must be an array (use [] for none)`); return { ...j, groups: [] }; }

    const groups = j.groups.map((g, gi) => {
      const gWhere = `${jWhere} → flow #${gi + 1}${g && g.title ? ` ("${g.title}")` : ''}`;
      if (!g || typeof g !== 'object') { errors.push(`${gWhere}: must be an object`); return null; }
      if (!g.title || typeof g.title !== 'string') errors.push(`${gWhere}: "title" is required`);
      if (g.id && groupIds.has(g.id)) errors.push(`${gWhere}: id "${g.id}" is used by another flow`);
      const gid = g.id ? (groupIds.add(g.id), g.id) : unique(groupIds, `${slug(j.id || 'j')}-${slug(g.title || 'flow')}`);
      if (!Array.isArray(g.links)) { errors.push(`${gWhere}: "links" must be an array`); return { ...g, id: gid, links: [] }; }

      const links = g.links.map((l, li) => {
        const lWhere = `${gWhere} → link #${li + 1}${l && l.title ? ` ("${l.title}")` : ''}`;
        if (!l || typeof l !== 'object') { errors.push(`${lWhere}: must be an object`); return null; }
        if (!l.title || typeof l.title !== 'string') errors.push(`${lWhere}: "title" is required`);
        if (l.id && linkIds.has(l.id)) errors.push(`${lWhere}: id "${l.id}" is used by another link`);
        const id = l.id ? (linkIds.add(l.id), l.id) : unique(linkIds, `${gid}--${slug(l.title || 'link')}`);

        const design = l.design ?? 'draft';
        if (!DESIGN.includes(design)) errors.push(`${lWhere}: design "${design}" is not valid. Use one of: ${DESIGN.join(', ')}`);
        const delivery = l.delivery ?? 'none';
        if (!DELIVERY.includes(delivery)) errors.push(`${lWhere}: delivery "${delivery}" is not valid. Use one of: ${DELIVERY.join(', ')}`);

        const url = l.url || DEFAULT_URL;
        if (!/^https?:\/\//.test(url)) errors.push(`${lWhere}: url must start with http:// or https://`);
        if (!l.url) warnings.push(`${lWhere}: no "url" yet, pointing at figma.com`);

        let updated = l.updated;
        if (!updated) { warnings.push(`${lWhere}: no "updated" date, shown as "—"`); updated = ''; }
        else if (!DATE_RE.test(updated)) errors.push(`${lWhere}: updated "${updated}" must look like 2026-11-20 or an ISO date-time`);

        const brands = {};
        for (const k of BRANDS) {
          const b = { ...emptyBrand(), ...((l.brands || {})[k] || {}) };
          if (!BRAND_STATUS.includes(b.status)) errors.push(`${lWhere}: brand "${k}" status "${b.status}" is not valid. Use one of: ${BRAND_STATUS.join(', ')}`);
          brands[k] = b;
        }
        for (const k of Object.keys(l.brands || {})) if (!BRANDS.includes(k)) warnings.push(`${lWhere}: unknown brand key "${k}" ignored (use ${BRANDS.join(', ')})`);
        const brandTracking = typeof l.brandTracking === 'boolean' ? l.brandTracking : BRANDS.some(k => brands[k].status !== 'not_shared');

        return { ...l, id, title: l.title, url, design, delivery, updated, brands, brandTracking };
      }).filter(Boolean);

      return { ...g, id: gid, links };
    }).filter(Boolean);

    return { ...j, groups };
  }).filter(Boolean);

  return { data, errors, warnings };
}

export function summary(data) {
  const flows = data.reduce((n, j) => n + j.groups.length, 0);
  const links = data.reduce((n, j) => n + j.groups.reduce((m, g) => m + g.links.length, 0), 0);
  return `${data.length} journeys · ${flows} flows · ${links} links`;
}
