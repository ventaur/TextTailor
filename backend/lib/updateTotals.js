/**
 * Updates the cumulative totals for each key in the provided items array.
 * 
 * @param {Object} totals - An object to hold the cumulative totals.
 * @param {Array} items - An array of objects where each object contains key-value pairs to be summed into the totals.
 */
export default function updateTotals(totals, items) {
    for (const item of items) {
        if (!item) continue;
        for (const key in item) {
            totals[key] = (totals[key] || 0) + item[key];
        }
    }
}