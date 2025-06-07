/**
 * Recursively finds all properties with the given key in a deeply nested object or array
 * and returns references to their values.
 * 
 * @param {object|array} obj - The object or array to search.
 * @param {string} targetKey - The key name to match.
 * @returns {array<any>} - An array of the matched properties' values.
 */
export function findDeepByKey(obj, targetKey) {
    const results = [];

    function search(node) {
        if (Array.isArray(node)) {
            node.forEach(search);
        } else if (node && typeof node === 'object') {
            for (const key in node) {
                if (key === targetKey) {
                    results.push(node[key]);
                }
                search(node[key]);
            }
        }
    }

    search(obj);
    return results;
}

/**
 * Recursively mutates (in-place) all values of a given key in a deeply nested object or array.
 *
 * @param {object|array} obj - The object or array to mutate.
 * @param {string} targetKey - The key name to match.
 * @param {(val: any) => any} mutator - A function to mutate the value.
 */
export function mutateDeepByKey(obj, targetKey, mutator) {
    if (Array.isArray(obj)) {
        obj.forEach(item => mutateDeepByKey(item, targetKey, mutator));
    } else if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (key === targetKey) {
                obj[key] = mutator(obj[key]);
            } else {
                mutateDeepByKey(obj[key], targetKey, mutator);
            }
        }
    }
}
