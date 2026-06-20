(function () {
  try {
    var savedTheme = window.localStorage && window.localStorage.getItem("theme");
    var hasStoredTheme = savedTheme === "dark" || savedTheme === "light";
    var prefersDark =
      !hasStoredTheme &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var shouldUseDark = hasStoredTheme ? savedTheme === "dark" : prefersDark;

    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  } catch (error) {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
})();
