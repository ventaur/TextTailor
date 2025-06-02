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
