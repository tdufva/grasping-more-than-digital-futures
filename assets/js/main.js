(function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const menuList = document.querySelector("#site-menu");

  if (menuToggle && menuList) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuList.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  document.querySelectorAll(".window").forEach((windowPanel) => {
    windowPanel.addEventListener("pointerdown", () => {
      document.querySelectorAll(".window.is-focused").forEach((activePanel) => {
        activePanel.classList.remove("is-focused");
      });
      windowPanel.classList.add("is-focused");
    });
  });

  const currentYear = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = currentYear;
  });

  const newsFilter = document.querySelector("[data-news-filter]");
  const newsItems = document.querySelectorAll("[data-news-type]");

  // News items are edited directly in news.html; this filter only changes the visible set.
  if (newsFilter && newsItems.length > 0) {
    newsFilter.addEventListener("change", () => {
      const selectedType = newsFilter.value;
      newsItems.forEach((item) => {
        const shouldShow = selectedType === "all" || item.dataset.newsType === selectedType;
        item.hidden = !shouldShow;
      });
    });
  }
})();
