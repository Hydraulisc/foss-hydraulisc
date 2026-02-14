const savedTheme = localStorage.getItem("theme") || "dark";

if (savedTheme === "custom") {
  try {
    const customTheme = JSON.parse(localStorage.getItem("customTheme"));
    if (customTheme && typeof customTheme === "object") {
      Object.entries(customTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
        const input = document.getElementById(key);
        if (input) input.value = value;
      });
    }
  } catch (err) {
    console.warn("Invalid theme data, reverting to dark mode.");
    localStorage.setItem("theme", "dark");
  }
} else {
  document.documentElement.setAttribute("data-theme", savedTheme);
}