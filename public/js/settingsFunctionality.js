const themeSelect = document.getElementById("theme-select");
const customApply = document.getElementById("apply-custom");

function changepfpmodal() {
    document.getElementById('pfpInput').click();
}
function changebannermodal() {
    document.getElementById('bannerInput').click();
}

// real-time updates?
themeSelect.addEventListener("change", (e) => {
    document.documentElement.setAttribute("data-theme", e.target.value);
    localStorage.setItem("theme", e.target.value);
    location.reload()
});

// custom themes
customApply.addEventListener("click", () => {
    const vars = {
        "background-primary": document.getElementById("custom-bg-color").value,
        "background-secondary": document.getElementById("custom-bg-secondary").value,
        "background-tertiary": document.getElementById("custom-bg-tertiary").value,
        "background-highlight": document.getElementById("custom-bg-highlight").value,
        "accent-primary": document.getElementById("custom-accent-color").value,
        "accent-secondary": document.getElementById("custom-accent-secondary").value,
        "accent-tertiary": document.getElementById("custom-accent-tertiary").value,
        "accent-highlight": document.getElementById("custom-accent-highlight").value,
        "text-primary": document.getElementById("custom-text-color").value,
        "text-secondary": document.getElementById("custom-text-secondary").value,
        "text-tertiary": document.getElementById("custom-text-tertiary").value,
    };

    // Apply to document
    for (let key in vars) {
        document.documentElement.style.setProperty(`--${key}`, vars[key]);
    }

    // mark it as "custom"
    localStorage.setItem("theme", "custom");
    localStorage.setItem("customTheme", JSON.stringify(vars));
});

// EXPORT: Convert saved customTheme to JSON and trigger download
function exportTheme() {
    const theme = JSON.parse(localStorage.getItem("customTheme"));
    if (!theme) return alert("No custom theme saved to export.");

    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hydraulisc-theme.json";
    a.click();
    URL.revokeObjectURL(url);
}