import { PROJECTS_URL, REQUIREMENTS_URL } from './config.js';

export async function fetchProjects() {
    const res = await fetch(PROJECTS_URL);
    const data = await res.json();
    return data
        .map((row, index) => ({
            id: +row["ID"],
            name: String(row["Project Name"]).trim(),
            parentCompany: String(row["Parent Company"]).trim(),
            spv: String(row["SPV"] || "").trim(),
            capacity: parseFloat(String(row["Capacity (MW)"]).replace(/,/g, "").trim()) || 0,
            bessCap: String(row["BESS Cap"] || "").trim(),
            subtype: String(row["Subtype"]).trim(),
            grid: String(row["Grid"]).trim(),
            tariff: parseFloat(String(row["Tariff"]).replace(/,/g, "").trim()) || 0,
            competitiveness: String(row["Competitiveness"] || "").trim(),
            compRanking: String(row["Comp. Ranking"] || "").trim(),
            likelihood: String(row["Likelihood"]).trim(),
            targetYear: String(row["GEA Lot Year"]).substring(0, 4),
            lookerLink: String(row["Looker Link"] || "").trim(),
            order: index,
            isMoved: false,
            bidderStatus: 'spillover'
        }))
        .filter(p => p.likelihood === 'High' || p.likelihood === 'Low'); // Only load 'High' and 'Low'
}

export async function fetchCapacityRequirements() {
    const res = await fetch(REQUIREMENTS_URL);
    return await res.json();
}