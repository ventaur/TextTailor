export default function escapeGhostFilterString(filterString) {
    // Escape special characters in the filter string to prevent issues with Ghost API.
    // * Single quotes and double quotes are escaped to ensure they are treated as literals.
    return filterString.replace(/['"]/g, '\\$&');
}
