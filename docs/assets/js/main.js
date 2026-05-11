(function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const menuList = document.querySelector("#site-menu");
  const backgroundSwatches = document.querySelectorAll("[data-background-choice]");
  const backgroundStorageKey = "gmdf-background-choice";
  const fallbackBackground = "classic";

  const setBackground = (choice) => {
    const validChoice = Array.from(backgroundSwatches).some((swatch) => swatch.dataset.backgroundChoice === choice)
      ? choice
      : fallbackBackground;

    document.documentElement.dataset.background = validChoice;
    backgroundSwatches.forEach((swatch) => {
      swatch.setAttribute("aria-pressed", String(swatch.dataset.backgroundChoice === validChoice));
    });

    try {
      window.localStorage.setItem(backgroundStorageKey, validChoice);
    } catch (error) {
      // The color preference should remain usable even if storage is unavailable.
    }
  };

  if (backgroundSwatches.length > 0) {
    let savedBackground = fallbackBackground;
    try {
      savedBackground = window.localStorage.getItem(backgroundStorageKey) || fallbackBackground;
    } catch (error) {
      savedBackground = fallbackBackground;
    }

    setBackground(savedBackground);

    backgroundSwatches.forEach((swatch) => {
      swatch.addEventListener("click", () => {
        setBackground(swatch.dataset.backgroundChoice);
      });
    });
  }

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

  const protectedEmail = document.querySelector("[data-protected-email]");

  if (protectedEmail) {
    const revealButton = protectedEmail.querySelector("[data-email-reveal]");
    const openLink = protectedEmail.querySelector("[data-email-open]");
    const copyButton = protectedEmail.querySelector("[data-email-copy]");
    const output = protectedEmail.querySelector("[data-email-output]");
    const protectedCodes = [123, 118, 116, 112, 53, 122, 115, 118, 123, 123, 108, 107, 124, 109, 125, 104, 71, 104, 104, 115, 123, 118, 53, 109, 112];
    const protectedShift = 7;
    let address = "";

    const decodeAddress = () => {
      if (!address) {
        address = protectedCodes.map((code) => String.fromCharCode(code - protectedShift)).join("");
      }
      return address;
    };

    const prepareContact = () => {
      const emailAddress = decodeAddress();
      const subject = encodeURIComponent("Grasping More-than-Digital Futures");
      if (openLink) {
        openLink.href = `mailto:${emailAddress}?subject=${subject}`;
        openLink.hidden = false;
      }
      if (copyButton) {
        copyButton.hidden = !navigator.clipboard;
      }
      if (output) {
        output.textContent = protectedEmail.dataset.readyMessage || "The protected contact options are ready.";
      }
      if (revealButton) {
        revealButton.textContent = "Contact options ready";
        revealButton.setAttribute("aria-pressed", "true");
      }
      return emailAddress;
    };

    revealButton?.addEventListener("click", () => {
      prepareContact();
      openLink?.focus();
    });

    copyButton?.addEventListener("click", async () => {
      const emailAddress = prepareContact();
      try {
        await navigator.clipboard.writeText(emailAddress);
        if (output) output.textContent = "Email address copied to clipboard.";
      } catch (error) {
        if (output) output.textContent = "Copy did not work. Use the email app button, or write the softened address shown here.";
      }
    });
  }

  const newsFilter = document.querySelector("[data-news-filter]");
  const newsItems = document.querySelectorAll("[data-news-type]");

  // News items are edited in src/_data/news.json; this filter only changes the visible set.
  if (newsFilter && newsItems.length > 0) {
    newsFilter.addEventListener("change", () => {
      const selectedType = newsFilter.value;
      newsItems.forEach((item) => {
        const shouldShow = selectedType === "all" || item.dataset.newsType === selectedType;
        item.hidden = !shouldShow;
      });
    });
  }

  const desktop = document.querySelector(".desktop-grid");
  const resetWindows = document.querySelector("[data-reset-windows]");
  const freeLayoutQuery = window.matchMedia("(min-width: 761px)");
  const layoutStorageKey = "gmdf-window-layout-v1";

  if (desktop) {
    const desktopWindows = Array.from(desktop.querySelectorAll(":scope > .window[data-window-id]"));
    let freeLayoutActive = false;
    let zCounter = 10;

    const readSavedLayout = () => {
      try {
        return JSON.parse(window.localStorage.getItem(layoutStorageKey) || "{}");
      } catch (error) {
        return {};
      }
    };

    const writeSavedLayout = () => {
      if (!freeLayoutActive) return;
      const layout = {};
      desktopWindows.forEach((windowPanel) => {
        const id = windowPanel.dataset.windowId;
        if (!id) return;
        layout[id] = {
          left: parseFloat(windowPanel.style.left) || 0,
          top: parseFloat(windowPanel.style.top) || 0,
          zIndex: parseInt(windowPanel.style.zIndex || "1", 10)
        };
      });
      try {
        window.localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
      } catch (error) {
        // Layout persistence is a convenience; dragging should still work without storage.
      }
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

    const bringToFront = (windowPanel) => {
      if (!freeLayoutActive) return;
      zCounter += 1;
      windowPanel.style.zIndex = String(zCounter);
      document.querySelectorAll(".window.is-focused").forEach((activePanel) => {
        activePanel.classList.remove("is-focused");
      });
      windowPanel.classList.add("is-focused");
      writeSavedLayout();
    };

    const setWindowPosition = (windowPanel, left, top) => {
      const maxLeft = desktop.clientWidth - windowPanel.offsetWidth;
      const maxTop = desktop.clientHeight - windowPanel.offsetHeight;
      windowPanel.style.left = `${clamp(left, 0, maxLeft)}px`;
      windowPanel.style.top = `${clamp(top, 0, maxTop)}px`;
    };

    const applyFreeLayout = () => {
      if (!desktopWindows.length || !freeLayoutQuery.matches || freeLayoutActive) return;

      const savedLayout = readSavedLayout();
      const desktopBox = desktop.getBoundingClientRect();
      const measured = desktopWindows.map((windowPanel) => {
        const rect = windowPanel.getBoundingClientRect();
        const saved = savedLayout[windowPanel.dataset.windowId] || null;
        return {
          windowPanel,
          left: rect.left - desktopBox.left,
          top: rect.top - desktopBox.top,
          width: rect.width,
          height: rect.height,
          saved
        };
      });
      const layoutHeight = Math.max(
        desktop.offsetHeight,
        ...measured.map((item) => item.top + item.height)
      );

      desktop.style.height = `${layoutHeight}px`;
      desktop.classList.add("is-free-layout");
      freeLayoutActive = true;
      zCounter = Math.max(10, ...measured.map((item, index) => item.saved?.zIndex || index + 1));

      measured.forEach((item, index) => {
        const { windowPanel, saved } = item;
        windowPanel.style.width = `${item.width}px`;
        windowPanel.style.zIndex = String(saved?.zIndex || index + 1);
        setWindowPosition(
          windowPanel,
          typeof saved?.left === "number" ? saved.left : item.left,
          typeof saved?.top === "number" ? saved.top : item.top
        );
      });

      if (resetWindows) resetWindows.hidden = false;
    };

    const disableFreeLayout = () => {
      if (!freeLayoutActive) return;
      freeLayoutActive = false;
      desktop.classList.remove("is-free-layout");
      desktop.style.height = "";
      desktopWindows.forEach((windowPanel) => {
        windowPanel.classList.remove("is-dragging");
        windowPanel.style.left = "";
        windowPanel.style.top = "";
        windowPanel.style.width = "";
        windowPanel.style.zIndex = "";
      });
      if (resetWindows) resetWindows.hidden = true;
    };

    const resetLayout = () => {
      try {
        window.localStorage.removeItem(layoutStorageKey);
      } catch (error) {
        // Nothing to reset if storage is unavailable.
      }
      disableFreeLayout();
      window.requestAnimationFrame(applyFreeLayout);
    };

    desktopWindows.forEach((windowPanel) => {
      const handle = windowPanel.querySelector(".title-bar");
      if (!handle) return;
      handle.tabIndex = 0;
      handle.setAttribute("role", "button");
      handle.setAttribute("aria-label", `Move ${windowPanel.textContent.trim().split(/\s+/).slice(0, 4).join(" ")} window`);

      let dragState = null;

      handle.addEventListener("pointerdown", (event) => {
        if (!freeLayoutActive || event.button !== 0) return;
        event.preventDefault();
        bringToFront(windowPanel);
        dragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: parseFloat(windowPanel.style.left) || 0,
          startTop: parseFloat(windowPanel.style.top) || 0
        };
        handle.setPointerCapture(event.pointerId);
        windowPanel.classList.add("is-dragging");
        document.body.classList.add("is-window-dragging");
      });

      handle.addEventListener("pointermove", (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const nextLeft = dragState.startLeft + event.clientX - dragState.startX;
        const nextTop = dragState.startTop + event.clientY - dragState.startY;
        setWindowPosition(windowPanel, nextLeft, nextTop);
      });

      const stopDrag = (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        dragState = null;
        windowPanel.classList.remove("is-dragging");
        document.body.classList.remove("is-window-dragging");
        writeSavedLayout();
      };

      handle.addEventListener("pointerup", stopDrag);
      handle.addEventListener("pointercancel", stopDrag);

      handle.addEventListener("keydown", (event) => {
        if (!freeLayoutActive) return;
        const step = event.shiftKey ? 24 : 8;
        const keys = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step]
        };
        const move = keys[event.key];
        if (!move) return;
        event.preventDefault();
        bringToFront(windowPanel);
        setWindowPosition(
          windowPanel,
          (parseFloat(windowPanel.style.left) || 0) + move[0],
          (parseFloat(windowPanel.style.top) || 0) + move[1]
        );
        writeSavedLayout();
      });
    });

    resetWindows?.addEventListener("click", resetLayout);

    const updateLayoutMode = () => {
      if (freeLayoutQuery.matches) {
        applyFreeLayout();
      } else {
        disableFreeLayout();
      }
    };

    freeLayoutQuery.addEventListener("change", updateLayoutMode);
    window.addEventListener("resize", () => {
      if (!freeLayoutActive) return;
      desktopWindows.forEach((windowPanel) => {
        setWindowPosition(
          windowPanel,
          parseFloat(windowPanel.style.left) || 0,
          parseFloat(windowPanel.style.top) || 0
        );
      });
      writeSavedLayout();
    });
    window.requestAnimationFrame(updateLayoutMode);
  }

  const companion = document.querySelector("[data-companion]");

  if (companion) {
    const petButton = companion.querySelector("[data-pet-dog]");
    const fetchButton = companion.querySelector("[data-fetch-thought]");
    const message = companion.querySelector("[data-dog-message]");
    const prize = companion.querySelector("[data-dog-prize]");
    const petCount = companion.querySelector("[data-pet-count]");
    const stage = companion.querySelector(".companion-stage");
    const companionDataElement = document.querySelector("#companion-data");
    let companionData = {};

    try {
      companionData = companionDataElement ? JSON.parse(companionDataElement.textContent || "{}") : {};
    } catch (error) {
      companionData = {};
    }

    const petMessages = companionData.petMessages || [
      "Pixel approves this methodology, conditionally.",
      "Good pet. A careful thought has been peer-reviewed.",
      "Tail wagging in slow scholarship mode.",
      "Pixel has detected a hidden connection between craft and infrastructure.",
      "Tiny companion status: deeply interdisciplinary."
    ];
    const fetchedThoughts = companionData.fetchedThoughts || [
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
          ? companionData.trustedNote || "Pixel now trusts this collective with a shared Zotero folder."
          : companionData.petPrompt || "Pet five times to earn Pixel's tiny archival trust.";
      }
      companion.classList.add("is-petted");
      showSpark();
      window.setTimeout(() => companion.classList.remove("is-petted"), 520);
    });

    fetchButton?.addEventListener("click", () => {
      if (message) message.textContent = choose(fetchedThoughts);
      if (prize) prize.textContent = companionData.fetchNote || "Pixel drops the prompt at your feet, then pretends it was rigorous all along.";
      companion.classList.add("is-focused");
    });
  }
})();
