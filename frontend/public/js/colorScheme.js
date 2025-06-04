// Initialize color scheme on page load.
document.addEventListener('DOMContentLoaded', () => {
    const schemeKey = 'color-scheme';

    const light = 'light';
    const dark =  'dark';
    const auto =  'auto';

    const schemeIndicators = {
        light: '☀️ Light',
        dark:  '🌑 Dark',
        auto:  '🌗 Auto'
    };

    const html = document.querySelector('html');
    const toggleControl = document.getElementById('colorSchemeToggle');
    toggleControl.addEventListener('click', toggleScheme);


    function getSystemColorScheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? dark : light;
    }

    function applyScheme(scheme) {
        html.style.setProperty("color-scheme", scheme === auto ? `${light} ${dark}` : scheme);

        const actualScheme = scheme === auto ? getSystemColorScheme() : scheme;
        document.documentElement.setAttribute('data-actual-color-scheme', actualScheme);

        toggleControl.textContent = schemeIndicators[scheme];
    }

    function determineNextScheme(currentScheme) {
        switch (currentScheme) {
            case light: return dark;
            case dark: return auto;
            default: return light;
        }
    }
    
    function getSchemePreference() {
        const savedScheme = localStorage.getItem(schemeKey);
        const scheme = savedScheme === dark || savedScheme === light ? savedScheme : auto;
        return scheme;
    }

    function toggleScheme() {
        const currentScheme = getSchemePreference();
        const newScheme = determineNextScheme(currentScheme);
        localStorage.setItem(schemeKey, newScheme);
        applyScheme(newScheme);
    }
    

    const schemePreference = getSchemePreference();
    applyScheme(schemePreference);
});