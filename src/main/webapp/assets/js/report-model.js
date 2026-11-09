(function (root) {
    'use strict';
    const statuses = {UNASSIGNED:'Needs assignment', ASSIGNED:'Assigned', IN_PROGRESS:'In progress', RESOLVED:'Resolved'};
    const severities = {LOW:'Low', MEDIUM:'Medium', HIGH:'High'};

    function dateBoundary(value, label) {
        if (!value) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a valid date.`);
        const time = Date.parse(`${value}T00:00:00.000Z`);
        if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value)
            throw new Error(`${label} must be a valid date.`);
        return time;
    }

    function areas(tree) {
        const entries = [];
        function walk(node, parent) {
            const label = parent ? `${parent} / ${node.name}` : node.name;
            const entry = {id:String(node.id), label, ids:[node.id]};
            if (node.type !== 'CITY') entries.push(entry);
            for (const child of node.children || []) entry.ids.push(...walk(child, node.type === 'CITY' ? '' : label));
            return entry.ids;
        }
        walk(tree, '');
        return entries;
    }

    function build(records, filters = {}, areaEntries = []) {
        const from = dateBoundary(filters.from, 'Start date');
        const to = dateBoundary(filters.to, 'End date');
        if (from !== null && to !== null && from > to) throw new Error('Start date must be on or before end date.');
        if (filters.status && !Object.hasOwn(statuses, filters.status)) throw new Error('Choose a valid status.');
        if (filters.severity && !Object.hasOwn(severities, filters.severity)) throw new Error('Choose a valid severity.');
        const selectedArea = areaEntries.find(a => a.id === filters.area);
        if (filters.area && filters.area !== 'city' && !selectedArea) throw new Error('Choose an available area.');
        const labels = new Map(areaEntries.map(a => [Number(a.id), a.label]));
        const rows = records.filter(record => {
            const time = Date.parse(record.createdAt);
            if (!Number.isFinite(time)) throw new Error('A complaint has an invalid submission date. Refresh or contact an administrator.');
            return (from === null || time >= from) && (to === null || time < to + 86400000)
                && (!filters.status || record.status === filters.status)
                && (!filters.severity || record.severity === filters.severity)
                && (!filters.area || (filters.area === 'city' ? record.zoneId === null : selectedArea.ids.includes(record.zoneId)));
        }).map(record => ({
            // Only report fields cross this boundary. Never copy full API objects into exports.
            id:record.id, subject:record.subject, severity:record.severity, status:record.status,
            area:record.zoneId === null ? 'Whole city' : labels.get(record.zoneId) || `Area #${record.zoneId}`,
            submitted:new Date(record.createdAt).toISOString(), reopenRequested:record.reopenRequested === true
        })).sort((a,b) => b.submitted.localeCompare(a.submitted) || b.id - a.id);
        const byStatus = Object.fromEntries(Object.keys(statuses).map(key => [key,0]));
        const bySeverity = Object.fromEntries(Object.keys(severities).map(key => [key,0]));
        const months = new Map();
        for (const row of rows) {
            if (!Object.hasOwn(byStatus,row.status) || !Object.hasOwn(bySeverity,row.severity)) throw new Error('A complaint has an unsupported status or severity. Refresh before printing.');
            byStatus[row.status]++; bySeverity[row.severity]++;
            const month = row.submitted.slice(0,7);
            months.set(month,(months.get(month) || 0) + 1);
        }
        return {rows, total:rows.length, open:rows.length - byStatus.RESOLVED,
            resolved:byStatus.RESOLVED, pending:rows.filter(r => r.reopenRequested).length,
            byStatus, bySeverity, months:[...months].sort(([a],[b]) => a.localeCompare(b))};
    }
    const api = {statuses, severities, areas, build};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.SmartCityReportModel = api;
})(globalThis);
