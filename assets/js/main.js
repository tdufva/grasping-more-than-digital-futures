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

  const companion = document.querySelector("[data-companion]");

  if (companion) {
    const petButton = companion.querySelector("[data-pet-dog]");
    const fetchButton = companion.querySelector("[data-fetch-thought]");
    const message = companion.querySelector("[data-dog-message]");
    const prize = companion.querySelector("[data-dog-prize]");
    const petCount = companion.querySelector("[data-pet-count]");
    const stage = companion.querySelector(".companion-stage");
    const petMessages = [
      "Pixel approves this methodology, conditionally.",
      "Good pet. A careful thought has been peer-reviewed.",
      "Tail wagging in slow scholarship mode.",
      "Pixel has detected a hidden connection between craft and infrastructure.",
      "Tiny companion status: deeply interdisciplinary."
    ];
    const fetchedThoughts = [
      "Prompt: What does AI fail to notice about hands, tools, and waiting?",
      "Prompt: Treat the cloud as a material place with wires, weather, bills, and repair.",
      "Prompt: Pair sloyd with server maintenance. See what refuses to become seamless.",
      "Prompt: Ask what a classroom remembers after the device is switched off.",
      "Prompt: Follow the smallest tool mark. It may know the future better than the dashboard."
    ];
    let count = 0;

    const choose = (items) => items[Math.floor(Math.random() * items.length)];

    const showSpark = () => {
      if (!stage || !petButton) return;
      const spark = document.createElement("span");
      const stageBox = stage.getBoundingClientRect();
      const dogBox = petButton.getBoundingClientRect();
      spark.className = "pet-spark";
      spark.setAttribute("aria-hidden", "true");
      spark.textContent = "◆";
      spark.style.left = `${dogBox.left - stageBox.left + dogBox.width * 0.62}px`;
      spark.style.top = `${dogBox.top - stageBox.top + 18}px`;
      stage.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove());
    };

    petButton?.addEventListener("click", () => {
      count += 1;
      if (petCount) petCount.textContent = String(count);
      if (message) message.textContent = choose(petMessages);
      if (prize) {
        prize.textContent = count >= 5
          ? "Pixel now trusts this collective with a shared Zotero folder."
          : "Pet five times to earn Pixel's tiny archival trust.";
      }
      companion.classList.add("is-petted");
      showSpark();
      window.setTimeout(() => companion.classList.remove("is-petted"), 520);
    });

    fetchButton?.addEventListener("click", () => {
      if (message) message.textContent = choose(fetchedThoughts);
      if (prize) prize.textContent = "Pixel drops the prompt at your feet, then pretends it was rigorous all along.";
      companion.classList.add("is-focused");
    });
  }
})();
