import { state } from './state.js';

export async function patchSheetRow(id, newLikelihood, newYear, newOrder) {
    console.log(`--- SIMULATING WRITE-BACK ---`);
    console.log(JSON.stringify({ action: 'updateProject', id, updates: { 'Likelihood': newLikelihood, 'GEA Lot Year': newYear, 'Order': newOrder } }, null, 2));
}