(function () {
  const editor = document.querySelector("[data-admin-editor]");
  if (!editor) return;

  const adminPasswordHash = "669f5a828b627d7c43dc0c07c91cc55e6270e16b8b432e151b9f5c0670e23689";
  const adminSessionKey = "gmdf-admin-unlocked-v1";
  const draftKeyPrefix = "gmdf-admin-draft-v2:";
  const lockPanel = editor.querySelector("[data-admin-lock]");
  const adminContent = editor.querySelector("[data-admin-content]");
  const loginForm = editor.querySelector("[data-admin-login]");
  const passwordInput = editor.querySelector("[data-admin-password]");
  const lockStatus = editor.querySelector("[data-admin-lock-status]");
  const formTitle = editor.querySelector("[data-admin-form-title]");
  const formMount = editor.querySelector("[data-admin-form]");
  const previewMount = editor.querySelector("[data-admin-preview]");
  const validationMount = editor.querySelector("[data-admin-validation]");
  const output = editor.querySelector("[data-admin-output]");
  const status = editor.querySelector("[data-admin-status]");
  const draftStatus = editor.querySelector("[data-admin-draft-status]");
  const tabButtons = Array.from(editor.querySelectorAll("[data-admin-tab]"));
  const workflowSteps = Array.from(editor.querySelectorAll("[data-admin-step]"));

  const clone = (value) => JSON.parse(JSON.stringify(value == null ? {} : value));
  const parseJsonScript = (id, fallback) => {
    const element = document.getElementById(id);
    if (!element) return clone(fallback);

    try {
      return JSON.parse(element.textContent || "null") ?? clone(fallback);
    } catch (error) {
      return clone(fallback);
    }
  };

  const files = parseJsonScript("admin-file-config", {});
  const state = {
    site: clone(parseJsonScript("admin-site-data", { home: {} })),
    members: clone(parseJsonScript("admin-members-data", { intro: "", heading: "", items: [] })),
    news: clone(parseJsonScript("admin-news-data", { intro: "", current: [], archive: [] })),
    research: clone(parseJsonScript("admin-research-data", [])),
    contact: clone(parseJsonScript("admin-contact-data", { invitationParagraphs: [], suggestions: [] })),
    companion: clone(parseJsonScript("admin-companion-data", { petMessages: [], fetchedThoughts: [] }))
  };
  const publishedState = clone(state);
  const restoredDrafts = new Set();
  const draftSavedAt = new Map();
  let active = "site";
  let draftTimer = 0;

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const trimStrings = (value) => {
    if (Array.isArray(value)) return value.map(trimStrings);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, trimStrings(item)]));
    }
    return typeof value === "string" ? value.trim() : value;
  };

  const isAbsoluteUrl = (value) => /^([a-z][a-z0-9+.-]*:|\/)/i.test(String(value || ""));
  const siteAssetUrl = (value) => {
    const src = String(value || "").trim();
    if (!src) return "";
    return isAbsoluteUrl(src) ? src : `../${src}`;
  };

  const slugify = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const ensureArray = (object, key) => {
    if (!Array.isArray(object[key])) object[key] = [];
    return object[key];
  };

  const homeData = () => {
    if (!state.site.home || typeof state.site.home !== "object") state.site.home = {};
    return state.site.home;
  };
  const memberItems = () => ensureArray(state.members, "items");
  const currentItems = () => ensureArray(state.news, "current");
  const archiveItems = () => ensureArray(state.news, "archive");
  const researchItems = () => {
    if (!Array.isArray(state.research)) state.research = [];
    return state.research;
  };

  const setLockStatus = (message, isError) => {
    if (!lockStatus) return;
    lockStatus.textContent = message;
    lockStatus.dataset.state = isError ? "error" : "ok";
  };

  const setStatus = (message, isError) => {
    if (!status) return;
    status.innerHTML = message;
    status.dataset.state = isError ? "error" : "ok";
  };

  const setWorkflow = (currentKey) => {
    const order = ["edit", "check", "github", "commit"];
    const currentIndex = Math.max(0, order.indexOf(currentKey));

    workflowSteps.forEach((step) => {
      const stepIndex = order.indexOf(step.dataset.adminStep);
      step.classList.toggle("is-complete", stepIndex < currentIndex);
      if (stepIndex === currentIndex) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };

  const digestPassword = async (value) => {
    if (!window.crypto?.subtle || !window.TextEncoder) {
      throw new Error("Password checking needs a modern browser with Web Crypto support.");
    }

    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const rememberUnlock = () => {
    try {
      window.sessionStorage.setItem(adminSessionKey, "true");
    } catch (error) {
      // The editor can stay unlocked for this page even when storage is unavailable.
    }
  };

  const forgetUnlock = () => {
    try {
      window.sessionStorage.removeItem(adminSessionKey);
    } catch (error) {
      // Nothing needs clearing when session storage is unavailable.
    }
  };

  const hasStoredUnlock = () => {
    try {
      return window.sessionStorage.getItem(adminSessionKey) === "true";
    } catch (error) {
      return false;
    }
  };

  const field = ({ label, value, scope, name, index, linkIndex, textarea, type = "text", wide, hint, rows = 4 }) => {
    const common = [
      `data-scope="${escapeHtml(scope)}"`,
      `data-field="${escapeHtml(name)}"`,
      typeof index === "number" ? `data-index="${index}"` : "",
      typeof linkIndex === "number" ? `data-link-index="${linkIndex}"` : ""
    ].filter(Boolean).join(" ");
    const className = `admin-field${wide ? " admin-field-wide" : ""}`;
    const hintText = hint ? `<small>${escapeHtml(hint)}</small>` : "";

    if (textarea) {
      return `<label class="${className}"><span>${escapeHtml(label)}</span><textarea ${common} rows="${rows}">${escapeHtml(value)}</textarea>${hintText}</label>`;
    }

    return `<label class="${className}"><span>${escapeHtml(label)}</span><input ${common} type="${escapeHtml(type)}" value="${escapeHtml(value)}">${hintText}</label>`;
  };

  const selectField = ({ label, value, scope, name, index, options, wide, hint }) => {
    const choices = options.map((option) => (
      `<option value="${escapeHtml(option.value)}"${option.value === value ? " selected" : ""}>${escapeHtml(option.label)}</option>`
    )).join("");
    const className = `admin-field${wide ? " admin-field-wide" : ""}`;
    const hintText = hint ? `<small>${escapeHtml(hint)}</small>` : "";
    return `<label class="${className}"><span>${escapeHtml(label)}</span><select data-scope="${escapeHtml(scope)}" data-field="${escapeHtml(name)}"${typeof index === "number" ? ` data-index="${index}"` : ""}>${choices}</select>${hintText}</label>`;
  };

  const compactField = (options) => field({ ...options, wide: true });
  const actionButton = (label, action, index, extra = "", disabled = false) => (
    `<button class="classic-button small" type="button" data-action="${action}"${typeof index === "number" ? ` data-index="${index}"` : ""}${extra}${disabled ? " disabled" : ""}>${escapeHtml(label)}</button>`
  );

  const itemActions = (prefix, index, length, noun) => `
    <div class="admin-item-actions" aria-label="Actions for ${escapeHtml(noun)}">
      ${actionButton("Move Up", `move-${prefix}-up`, index, "", index === 0)}
      ${actionButton("Move Down", `move-${prefix}-down`, index, "", index === length - 1)}
      ${actionButton("Remove", `delete-${prefix}`, index)}
    </div>
  `;

  const renderStringList = ({ title, items, scope, prefix, itemLabel, textarea = true, hint }) => {
    const content = items.map((item, index) => `
      <div class="admin-list-row">
        ${field({ label: `${itemLabel} ${index + 1}`, value: item, scope, name: "value", index, textarea, wide: true, rows: textarea ? 3 : 1, hint })}
        <div class="admin-row-actions">
          ${actionButton("Up", `move-${prefix}-up`, index, "", index === 0)}
          ${actionButton("Down", `move-${prefix}-down`, index, "", index === items.length - 1)}
          ${actionButton("Remove", `delete-${prefix}`, index)}
        </div>
      </div>
    `).join("");

    return `
      <section class="admin-list-section">
        <div class="admin-section-title">
          <h3>${escapeHtml(title)}</h3>
          ${actionButton(`Add ${itemLabel}`, `add-${prefix}`)}
        </div>
        ${content || `<p class="system-note">No ${escapeHtml(title.toLowerCase())} yet.</p>`}
      </section>
    `;
  };

  const cleanMember = (member) => {
    const image = member.image || {};
    const imageOutput = {};
    if (image.src) imageOutput.src = String(image.src).trim();
    if (image.alt) imageOutput.alt = String(image.alt).trim();
    if (image.width) imageOutput.width = Number(image.width) || image.width;
    if (image.height) imageOutput.height = Number(image.height) || image.height;

    const outputMember = {
      name: String(member.name || "").trim(),
      role: String(member.role || "").trim(),
      institution: String(member.institution || "").trim()
    };
    if (Object.keys(imageOutput).length > 0) outputMember.image = imageOutput;
    outputMember.researchInterests = String(member.researchInterests || "").trim();
    outputMember.bio = String(member.bio || "").trim();

    const links = Array.isArray(member.links) ? member.links : [];
    const cleanLinks = links
      .map((link) => ({ label: String(link.label || "").trim(), url: String(link.url || "").trim() }))
      .filter((link) => link.label || link.url);
    if (cleanLinks.length > 0) outputMember.links = cleanLinks;
    return outputMember;
  };

  const cleanNewsItem = (item) => ({
    date: String(item.date || "").trim(),
    title: String(item.title || "").trim(),
    type: String(item.type || "").trim(),
    typeSlug: String(item.typeSlug || "").trim() || slugify(item.type),
    description: String(item.description || "").trim(),
    url: String(item.url || "").trim(),
    linkLabel: String(item.linkLabel || "").trim()
  });

  const cleanArchiveItem = (item) => ({
    date: String(item.date || "").trim(),
    description: String(item.description || "").trim()
  });

  const cleanForOutput = (key = active) => {
    if (key === "members") {
      return {
        intro: String(state.members.intro || "").trim(),
        heading: String(state.members.heading || "").trim(),
        items: memberItems().map(cleanMember)
      };
    }
    if (key === "news") {
      return {
        intro: String(state.news.intro || "").trim(),
        current: currentItems().map(cleanNewsItem),
        archive: archiveItems().map(cleanArchiveItem)
      };
    }
    return trimStrings(clone(state[key]));
  };

  const currentJson = (key = active) => `${JSON.stringify(cleanForOutput(key), null, 2)}\n`;
  const publishedJson = (key) => `${JSON.stringify(trimStrings(clone(publishedState[key])), null, 2)}\n`;
  const isDirty = (key = active) => currentJson(key) !== publishedJson(key);
  const draftStorageKey = (key) => `${draftKeyPrefix}${key}`;

  const updateDraftUi = () => {
    tabButtons.forEach((button) => {
      const key = button.dataset.adminTab;
      const dirty = isDirty(key);
      const label = files[key]?.label || key;
      button.classList.toggle("has-draft", dirty);
      button.setAttribute("aria-label", dirty ? `${label}, browser draft saved` : label);
    });

    const restoreButton = editor.querySelector('[data-admin-action="restore"]');
    if (restoreButton) restoreButton.disabled = !isDirty(active);
    if (!draftStatus) return;

    if (!isDirty(active)) {
      draftStatus.textContent = "No browser draft for this file.";
      draftStatus.dataset.state = "clean";
      return;
    }

    const time = draftSavedAt.get(active);
    draftStatus.textContent = time
      ? `Draft saved in this browser at ${time}. It is not public yet.`
      : "Draft restored from this browser. It is not public yet.";
    draftStatus.dataset.state = "draft";
  };

  const saveDraft = (key = active) => {
    window.clearTimeout(draftTimer);
    try {
      if (!isDirty(key)) {
        window.localStorage.removeItem(draftStorageKey(key));
        draftSavedAt.delete(key);
      } else {
        const savedAt = new Date();
        window.localStorage.setItem(draftStorageKey(key), JSON.stringify({
          data: state[key],
          base: publishedState[key],
          savedAt: savedAt.toISOString()
        }));
        draftSavedAt.set(key, savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (error) {
      if (draftStatus) {
        draftStatus.textContent = "This browser blocked draft storage. Download a backup before leaving.";
        draftStatus.dataset.state = "error";
      }
      return;
    }
    updateDraftUi();
  };

  const queueDraftSave = () => {
    if (draftStatus) {
      draftStatus.textContent = "Saving browser draft...";
      draftStatus.dataset.state = "saving";
    }
    window.clearTimeout(draftTimer);
    const key = active;
    draftTimer = window.setTimeout(() => saveDraft(key), 350);
  };

  const restoreBrowserDrafts = () => {
    Object.keys(state).forEach((key) => {
      try {
        const raw = window.localStorage.getItem(draftStorageKey(key));
        if (!raw) return;
        const stored = JSON.parse(raw);
        const draft = stored && Object.prototype.hasOwnProperty.call(stored, "data") ? stored.data : stored;
        const expectedArray = key === "research";
        const validShape = expectedArray ? Array.isArray(draft) : draft && typeof draft === "object" && !Array.isArray(draft);
        if (!validShape) return;

        if (JSON.stringify(trimStrings(draft)) === JSON.stringify(trimStrings(publishedState[key]))) {
          window.localStorage.removeItem(draftStorageKey(key));
          return;
        }

        state[key] = clone(draft);
        restoredDrafts.add(key);
        if (stored.savedAt) {
          const saved = new Date(stored.savedAt);
          if (!Number.isNaN(saved.getTime())) {
            draftSavedAt.set(key, saved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        }
      } catch (error) {
        // Ignore unreadable drafts and continue with the published page data.
      }
    });
  };

  const required = (messages, value, label) => {
    if (!String(value || "").trim()) messages.push(`${label} is required.`);
  };

  const validateSite = () => {
    const messages = [];
    const home = homeData();
    required(messages, state.site.title, "Site title");
    required(messages, state.site.subtitle, "Homepage subtitle");
    required(messages, home.lead, "Homepage introduction");
    ensureArray(home, "descriptionParagraphs").forEach((item, index) => required(messages, item, `About paragraph ${index + 1}`));
    ensureArray(home, "coreInterests").forEach((item, index) => required(messages, item, `Core interest ${index + 1}`));
    ensureArray(home, "ctas").forEach((item, index) => {
      required(messages, item.label, `Homepage button ${index + 1} label`);
      required(messages, item.url, `Homepage button ${index + 1} link`);
    });
    ensureArray(home, "interestCards").forEach((item, index) => {
      required(messages, item.title, `Interest card ${index + 1} title`);
      required(messages, item.text, `Interest card ${index + 1} text`);
    });
    return messages;
  };

  const validateMembers = () => {
    const messages = [];
    required(messages, state.members.intro, "Members intro");
    required(messages, state.members.heading, "Members heading");
    if (memberItems().length === 0) messages.push("Add at least one member.");

    memberItems().forEach((member, index) => {
      const label = member.name || `Member ${index + 1}`;
      ["name", "role", "institution", "researchInterests", "bio"].forEach((key) => required(messages, member[key], `${label}: ${key}`));
      if (member.image?.src && !member.image?.alt) messages.push(`${label}: image alt text is required when an image source is set.`);
      (member.links || []).forEach((link, linkIndex) => {
        if ((link.label || link.url) && (!link.label || !link.url)) messages.push(`${label}: link ${linkIndex + 1} needs both label and URL.`);
      });
    });
    return messages;
  };

  const validateNews = () => {
    const messages = [];
    required(messages, state.news.intro, "News intro");
    currentItems().forEach((item, index) => {
      const label = item.title || `Current item ${index + 1}`;
      ["date", "title", "type", "description"].forEach((key) => required(messages, item[key], `${label}: ${key}`));
      if (item.url && !item.linkLabel) messages.push(`${label}: add link text when a link URL is present.`);
    });
    archiveItems().forEach((item, index) => {
      required(messages, item.date, `Archive item ${index + 1}: date`);
      required(messages, item.description, `Archive item ${index + 1}: description`);
    });
    return messages;
  };

  const validateResearch = () => {
    const messages = [];
    if (researchItems().length === 0) messages.push("Add at least one research theme.");
    researchItems().forEach((item, index) => {
      required(messages, item.title, `Research theme ${index + 1}: title`);
      required(messages, item.description, `Research theme ${index + 1}: description`);
    });
    return messages;
  };

  const validateContact = () => {
    const messages = [];
    required(messages, state.contact.intro, "Contact introduction");
    required(messages, state.contact.note, "Contact note");
    ensureArray(state.contact, "invitationParagraphs").forEach((item, index) => required(messages, item, `Invitation paragraph ${index + 1}`));
    ensureArray(state.contact, "suggestions").forEach((item, index) => required(messages, item, `Contact suggestion ${index + 1}`));
    ["emailActionLabel", "emailOpenLabel", "emailCopyLabel", "emailFallback", "emailHelp", "emailReadyMessage"].forEach((key) => {
      required(messages, state.contact[key], `Protected email setting: ${key}`);
    });
    return messages;
  };

  const validateCompanion = () => {
    const messages = [];
    ["systemNote", "initialMessage", "initialNote", "petPrompt", "trustedNote", "fetchNote"].forEach((key) => required(messages, state.companion[key], `Pixel setting: ${key}`));
    if (ensureArray(state.companion, "petMessages").length === 0) messages.push("Add at least one pet response.");
    if (ensureArray(state.companion, "fetchedThoughts").length === 0) messages.push("Add at least one fetched thought.");
    return messages;
  };

  const validators = {
    site: validateSite,
    members: validateMembers,
    news: validateNews,
    research: validateResearch,
    contact: validateContact,
    companion: validateCompanion
  };
  const validateActive = () => (validators[active] ? validators[active]() : []);

  const renderValidation = () => {
    if (!validationMount) return;
    const messages = validateActive();
    validationMount.innerHTML = messages.length
      ? messages.map((message) => `<li class="admin-validation-error">${escapeHtml(message)}</li>`).join("")
      : '<li class="admin-validation-ok">Required fields look complete.</li>';
  };

  const renderSiteEditor = () => {
    const home = homeData();
    const paragraphs = ensureArray(home, "descriptionParagraphs");
    const interests = ensureArray(home, "coreInterests");
    const ctas = ensureArray(home, "ctas");
    const cards = ensureArray(home, "interestCards");
    const ctaHtml = ctas.map((cta, index) => `
      <fieldset class="admin-item">
        <legend>Homepage button ${index + 1}</legend>
        ${itemActions("cta", index, ctas.length, cta.label || `button ${index + 1}`)}
        <div class="admin-field-grid">
          ${field({ label: "Button text", value: cta.label, scope: "site-cta", name: "label", index })}
          ${field({ label: "Link", value: cta.url, scope: "site-cta", name: "url", index, hint: "Example: research.html" })}
        </div>
      </fieldset>
    `).join("");
    const cardHtml = cards.map((card, index) => `
      <fieldset class="admin-item">
        <legend>${escapeHtml(card.title || `Interest card ${index + 1}`)}</legend>
        ${itemActions("interest-card", index, cards.length, card.title || `interest card ${index + 1}`)}
        <div class="admin-field-grid">
          ${field({ label: "Title", value: card.title, scope: "site-card", name: "title", index })}
          ${selectField({
            label: "Small icon",
            value: card.icon || "folder",
            scope: "site-card",
            name: "icon",
            index,
            options: [
              { value: "folder", label: "Folder" },
              { value: "hand", label: "Handmade mark" },
              { value: "circuit", label: "Circuit" }
            ]
          })}
          ${field({ label: "Icon description", value: card.iconLabel, scope: "site-card", name: "iconLabel", index, wide: true, hint: "Short alt text for screen-reader users." })}
          ${field({ label: "Text", value: card.text, scope: "site-card", name: "text", index, textarea: true, wide: true })}
        </div>
      </fieldset>
    `).join("");

    return `
      <div class="admin-form-stack">
        <section class="admin-form-section">
          <div class="admin-section-title"><h3>Identity</h3></div>
          <div class="admin-field-grid">
            ${field({ label: "Group name", value: state.site.title, scope: "site-root", name: "title", wide: true })}
            ${field({ label: "Homepage subtitle", value: state.site.subtitle, scope: "site-root", name: "subtitle", textarea: true, wide: true })}
            ${field({ label: "Search description", value: state.site.description, scope: "site-root", name: "description", textarea: true, wide: true, hint: "A short description used by search engines." })}
            ${field({ label: "Footer line", value: state.site.footerTagline, scope: "site-root", name: "footerTagline", wide: true })}
          </div>
        </section>
        <section class="admin-form-section">
          <div class="admin-section-title"><h3>Welcome Window</h3></div>
          <div class="admin-field-grid">
            ${field({ label: "Small label", value: home.systemNote, scope: "site-home", name: "systemNote" })}
            ${field({ label: "Main introduction", value: home.lead, scope: "site-home", name: "lead", textarea: true, wide: true, rows: 7 })}
          </div>
        </section>
        ${renderStringList({ title: "About paragraphs", items: paragraphs, scope: "site-description", prefix: "description", itemLabel: "Paragraph" })}
        ${renderStringList({ title: "Core research interests", items: interests, scope: "site-interest", prefix: "interest", itemLabel: "Interest", textarea: false })}
        <section class="admin-list-section">
          <div class="admin-section-title"><h3>Homepage Buttons</h3>${actionButton("Add Button", "add-cta")}</div>
          ${ctaHtml || '<p class="system-note">No homepage buttons yet.</p>'}
        </section>
        <section class="admin-list-section">
          <div class="admin-section-title"><h3>Lower-page Interest Cards</h3>${actionButton("Add Card", "add-interest-card")}</div>
          ${cardHtml || '<p class="system-note">No interest cards yet.</p>'}
        </section>
      </div>
    `;
  };

  const renderMembersEditor = () => {
    const items = memberItems();
    const itemHtml = items.map((member, index) => {
      if (!Array.isArray(member.links)) member.links = [];
      if (!member.image) member.image = {};
      const links = member.links.map((link, linkIndex) => `
        <div class="admin-link-row">
          ${compactField({ label: "Link text", value: link.label, scope: "member-link", name: "label", index, linkIndex })}
          ${compactField({ label: "URL", value: link.url, scope: "member-link", name: "url", index, linkIndex })}
          <button class="classic-button small" type="button" data-action="delete-link" data-index="${index}" data-link-index="${linkIndex}">Remove Link</button>
        </div>
      `).join("");

      return `
        <details class="admin-item admin-collapsible"${index === 0 ? " open" : ""}>
          <summary class="admin-item-summary"><span>${index + 1}. ${escapeHtml(member.name || "New member")}</span><span>${escapeHtml(member.role || "Role not set")}</span></summary>
          <div class="admin-item-content">
            ${itemActions("member", index, items.length, member.name || `member ${index + 1}`)}
            <div class="admin-field-grid">
              ${field({ label: "Name", value: member.name, scope: "member", name: "name", index })}
              ${field({ label: "Role", value: member.role, scope: "member", name: "role", index })}
              ${field({ label: "Institution", value: member.institution, scope: "member", name: "institution", index, wide: true })}
              ${field({ label: "Research interests", value: member.researchInterests, scope: "member", name: "researchInterests", index, textarea: true, wide: true })}
              ${field({ label: "Short bio", value: member.bio, scope: "member", name: "bio", index, textarea: true, wide: true })}
            </div>
            <details class="admin-details">
              <summary>Portrait image</summary>
              <div class="admin-field-grid">
                ${field({ label: "Image path", value: member.image.src, scope: "member-image", name: "src", index, wide: true, hint: "Example: assets/images/members/name.jpg" })}
                ${field({ label: "Alt text", value: member.image.alt, scope: "member-image", name: "alt", index, wide: true })}
                ${field({ label: "Width", value: member.image.width, scope: "member-image", name: "width", index })}
                ${field({ label: "Height", value: member.image.height, scope: "member-image", name: "height", index })}
              </div>
            </details>
            <details class="admin-details">
              <summary>Links (${member.links.length})</summary>
              <div class="admin-link-list">${links || '<p class="system-note">No links yet.</p>'}</div>
              ${actionButton("Add Link", "add-link", index)}
            </details>
          </div>
        </details>
      `;
    }).join("");

    return `
      <div class="admin-form-stack">
        ${field({ label: "Members intro", value: state.members.intro, scope: "members-root", name: "intro", textarea: true, wide: true })}
        ${field({ label: "Members heading", value: state.members.heading, scope: "members-root", name: "heading", wide: true })}
        <div class="admin-section-title"><h3>Member Cards</h3>${actionButton("Add Member", "add-member")}</div>
        ${itemHtml || '<p class="system-note">No members yet.</p>'}
      </div>
    `;
  };

  const renderNewsItemFields = (item, index, scope, archive) => {
    if (archive) {
      return `<div class="admin-field-grid">
        ${field({ label: "Date", value: item.date, scope, name: "date", index, hint: "Use YYYY-MM-DD or TBA." })}
        ${field({ label: "Description", value: item.description, scope, name: "description", index, textarea: true, wide: true })}
      </div>`;
    }
    return `<div class="admin-field-grid">
      ${field({ label: "Date", value: item.date, scope, name: "date", index, hint: "Use YYYY-MM-DD or TBA." })}
      ${field({ label: "Title", value: item.title, scope, name: "title", index })}
      ${field({ label: "Type", value: item.type, scope, name: "type", index, hint: "Example: Seminar, Workshop, Call" })}
      ${field({ label: "Filter label", value: item.typeSlug, scope, name: "typeSlug", index, hint: "Optional; generated from type when blank." })}
      ${field({ label: "Description", value: item.description, scope, name: "description", index, textarea: true, wide: true })}
      ${field({ label: "Link URL", value: item.url, scope, name: "url", index, wide: true })}
      ${field({ label: "Link text", value: item.linkLabel, scope, name: "linkLabel", index })}
    </div>`;
  };

  const renderNewsEditor = () => {
    const current = currentItems();
    const archive = archiveItems();
    const currentHtml = current.map((item, index) => `
      <details class="admin-item admin-collapsible"${index === 0 ? " open" : ""}>
        <summary class="admin-item-summary"><span>${escapeHtml(item.title || `Current item ${index + 1}`)}</span><span>${escapeHtml(item.date || "No date")}</span></summary>
        <div class="admin-item-content">
          ${itemActions("current", index, current.length, item.title || `current item ${index + 1}`)}
          ${renderNewsItemFields(item, index, "news-current", false)}
        </div>
      </details>
    `).join("");
    const archiveHtml = archive.map((item, index) => `
      <details class="admin-item admin-collapsible">
        <summary class="admin-item-summary"><span>Archive ${index + 1}</span><span>${escapeHtml(item.date || "No date")}</span></summary>
        <div class="admin-item-content">
          ${itemActions("archive", index, archive.length, `archive item ${index + 1}`)}
          ${renderNewsItemFields(item, index, "news-archive", true)}
        </div>
      </details>
    `).join("");

    return `<div class="admin-form-stack">
      ${field({ label: "News intro", value: state.news.intro, scope: "news-root", name: "intro", textarea: true, wide: true })}
      <div class="admin-section-title"><h3>Current News + Events</h3>${actionButton("Add Current Item", "add-current")}</div>
      ${currentHtml || '<p class="system-note">No current items yet.</p>'}
      <div class="admin-section-title"><h3>Archive</h3>${actionButton("Add Archive Item", "add-archive")}</div>
      ${archiveHtml || '<p class="system-note">No archive items yet.</p>'}
    </div>`;
  };

  const renderResearchEditor = () => {
    const items = researchItems();
    const itemHtml = items.map((item, index) => `
      <fieldset class="admin-item">
        <legend>${index + 1}. ${escapeHtml(item.title || "New research theme")}</legend>
        ${itemActions("research", index, items.length, item.title || `research theme ${index + 1}`)}
        <div class="admin-field-grid">
          ${field({ label: "Theme title", value: item.title, scope: "research-item", name: "title", index, wide: true })}
          ${field({ label: "Concise explanation", value: item.description, scope: "research-item", name: "description", index, textarea: true, wide: true, rows: 5 })}
        </div>
      </fieldset>
    `).join("");
    return `<div class="admin-form-stack">
      <p class="system-note">These themes appear as cards on the Research page.</p>
      <div class="admin-section-title"><h3>Research Themes</h3>${actionButton("Add Theme", "add-research")}</div>
      ${itemHtml || '<p class="system-note">No research themes yet.</p>'}
    </div>`;
  };

  const renderContactEditor = () => {
    const invitations = ensureArray(state.contact, "invitationParagraphs");
    const suggestions = ensureArray(state.contact, "suggestions");
    return `<div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-title"><h3>Invitation</h3></div>
        <div class="admin-field-grid">
          ${field({ label: "Page introduction", value: state.contact.intro, scope: "contact-root", name: "intro", textarea: true, wide: true })}
          ${field({ label: "Gentle note", value: state.contact.note, scope: "contact-root", name: "note", textarea: true, wide: true })}
        </div>
      </section>
      ${renderStringList({ title: "Invitation paragraphs", items: invitations, scope: "contact-invitation", prefix: "contact-invitation", itemLabel: "Paragraph" })}
      ${renderStringList({ title: "Contact suggestions", items: suggestions, scope: "contact-suggestion", prefix: "contact-suggestion", itemLabel: "Suggestion", textarea: false })}
      <details class="admin-advanced">
        <summary>Protected email button wording</summary>
        <p class="system-note">These fields change the labels and explanation. The protected address itself remains in the site script.</p>
        <div class="admin-field-grid">
          ${field({ label: "Main contact button", value: state.contact.emailActionLabel, scope: "contact-root", name: "emailActionLabel" })}
          ${field({ label: "Open email button", value: state.contact.emailOpenLabel, scope: "contact-root", name: "emailOpenLabel" })}
          ${field({ label: "Copy address button", value: state.contact.emailCopyLabel, scope: "contact-root", name: "emailCopyLabel" })}
          ${field({ label: "Hidden-address fallback", value: state.contact.emailFallback, scope: "contact-root", name: "emailFallback", wide: true })}
          ${field({ label: "Privacy explanation", value: state.contact.emailHelp, scope: "contact-root", name: "emailHelp", textarea: true, wide: true })}
          ${field({ label: "Ready message", value: state.contact.emailReadyMessage, scope: "contact-root", name: "emailReadyMessage", wide: true })}
        </div>
      </details>
    </div>`;
  };

  const renderCompanionEditor = () => {
    const petMessages = ensureArray(state.companion, "petMessages");
    const thoughts = ensureArray(state.companion, "fetchedThoughts");
    return `<div class="admin-form-stack">
      <section class="admin-form-section">
        <div class="admin-section-title"><h3>Pixel's Window</h3></div>
        <div class="admin-field-grid">
          ${field({ label: "Small label", value: state.companion.systemNote, scope: "companion-root", name: "systemNote" })}
          ${field({ label: "Initial speech bubble", value: state.companion.initialMessage, scope: "companion-root", name: "initialMessage", wide: true })}
          ${field({ label: "Initial note", value: state.companion.initialNote, scope: "companion-root", name: "initialNote", textarea: true, wide: true })}
          ${field({ label: "Pet progress message", value: state.companion.petPrompt, scope: "companion-root", name: "petPrompt", textarea: true, wide: true })}
          ${field({ label: "Five-pet reward", value: state.companion.trustedNote, scope: "companion-root", name: "trustedNote", textarea: true, wide: true })}
          ${field({ label: "After fetching a thought", value: state.companion.fetchNote, scope: "companion-root", name: "fetchNote", textarea: true, wide: true })}
        </div>
      </section>
      ${renderStringList({ title: "Pet responses", items: petMessages, scope: "companion-pet", prefix: "companion-pet", itemLabel: "Response" })}
      ${renderStringList({ title: "Fetched research prompts", items: thoughts, scope: "companion-thought", prefix: "companion-thought", itemLabel: "Prompt" })}
    </div>`;
  };

  const renderMemberPreview = () => {
    const cards = memberItems().slice(0, 3).map((member) => {
      const image = member.image?.src
        ? `<figure class="member-portrait"><img src="${escapeHtml(siteAssetUrl(member.image.src))}" alt="${escapeHtml(member.image.alt || `Portrait of ${member.name || "member"}`)}"></figure>`
        : '<figure class="member-portrait"><span class="member-portrait-placeholder" role="img" aria-label="Portrait placeholder"></span></figure>';
      const links = (member.links || []).filter((link) => link.label && link.url)
        .map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`)
        .join('<span aria-hidden="true">|</span>');
      return `<article class="admin-preview-card">
        <h4>${escapeHtml(member.name || "Unnamed member")}</h4>${image}
        <dl class="profile-list"><dt>Role</dt><dd>${escapeHtml(member.role || "")}</dd><dt>Institution</dt><dd>${escapeHtml(member.institution || "")}</dd><dt>Research interests</dt><dd>${escapeHtml(member.researchInterests || "")}</dd></dl>
        <p>${escapeHtml(member.bio || "")}</p>${links ? `<p class="profile-links">${links}</p>` : ""}
      </article>`;
    }).join("");
    const remainder = memberItems().length - 3;
    return `<div class="admin-preview-list">${cards || '<p class="system-note">No members to preview yet.</p>'}${remainder > 0 ? `<p class="system-note">Plus ${remainder} more member card(s).</p>` : ""}</div>`;
  };

  const renderNewsPreview = () => {
    const current = currentItems().map((item) => `<article class="admin-preview-card">
      <p class="item-meta">${escapeHtml(item.date || "")} · ${escapeHtml(item.type || "")}</p>
      <h4>${escapeHtml(item.title || "Untitled item")}</h4><p>${escapeHtml(item.description || "")}</p>
      ${item.url ? `<a class="text-link" href="${escapeHtml(item.url)}">${escapeHtml(item.linkLabel || "Link")}</a>` : ""}
    </article>`).join("");
    const archive = archiveItems().map((item) => `<li><strong>${escapeHtml(item.date || "")}</strong> · ${escapeHtml(item.description || "")}</li>`).join("");
    return `<div class="admin-preview-list">${current || '<p class="system-note">No current items to preview yet.</p>'}<div class="admin-archive-preview"><h4>Archive</h4><ul class="compact-list">${archive || "<li>No archive items yet.</li>"}</ul></div></div>`;
  };

  const renderSitePreview = () => {
    const home = homeData();
    const buttons = ensureArray(home, "ctas").map((cta) => `<span class="classic-button small">${escapeHtml(cta.label || "Button")}</span>`).join("");
    const interests = ensureArray(home, "coreInterests").map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `<div class="admin-preview-list"><article class="admin-preview-card admin-home-preview">
      <p class="system-note">${escapeHtml(home.systemNote || "")}</p>
      <h4>${escapeHtml(state.site.title || "Untitled site")}</h4>
      <p class="admin-preview-subtitle">${escapeHtml(state.site.subtitle || "")}</p>
      <p>${escapeHtml(home.lead || "")}</p><div class="button-row">${buttons}</div>
    </article><article class="admin-archive-preview"><h4>Core interests</h4><ul class="check-list">${interests}</ul></article></div>`;
  };

  const renderResearchPreview = () => `<div class="admin-preview-list">${researchItems().map((item) => `<article class="admin-preview-card"><h4>${escapeHtml(item.title || "Untitled theme")}</h4><p>${escapeHtml(item.description || "")}</p></article>`).join("")}</div>`;
  const renderContactPreview = () => `<div class="admin-preview-list"><article class="admin-preview-card"><h4>Contact / Join Us</h4><p>${escapeHtml(state.contact.intro || "")}</p>${ensureArray(state.contact, "invitationParagraphs").map((item) => `<p>${escapeHtml(item)}</p>`).join("")}<span class="classic-button small">${escapeHtml(state.contact.emailActionLabel || "Contact")}</span></article><article class="admin-archive-preview"><h4>A Gentle Note</h4><p>${escapeHtml(state.contact.note || "")}</p></article></div>`;
  const renderCompanionPreview = () => `<div class="admin-preview-list"><article class="admin-preview-card"><h4>Desktop Companion</h4><p class="thought-bubble admin-static-bubble">${escapeHtml(state.companion.initialMessage || "")}</p><p>${escapeHtml(state.companion.initialNote || "")}</p></article><article class="admin-archive-preview"><h4>Sample fetched prompt</h4><p>${escapeHtml(ensureArray(state.companion, "fetchedThoughts")[0] || "No prompt yet.")}</p></article></div>`;

  const editors = {
    site: renderSiteEditor,
    members: renderMembersEditor,
    news: renderNewsEditor,
    research: renderResearchEditor,
    contact: renderContactEditor,
    companion: renderCompanionEditor
  };
  const previews = {
    site: renderSitePreview,
    members: renderMemberPreview,
    news: renderNewsPreview,
    research: renderResearchPreview,
    contact: renderContactPreview,
    companion: renderCompanionPreview
  };

  const renderPreview = () => {
    if (previewMount) previewMount.innerHTML = previews[active] ? previews[active]() : "";
  };
  const renderOutput = () => {
    if (output) output.value = currentJson();
  };

  const renderMeta = () => {
    const file = files[active] || {};
    tabButtons.forEach((button) => {
      const selected = button.dataset.adminTab === active;
      button.setAttribute("aria-selected", String(selected));
      button.setAttribute("tabindex", selected ? "0" : "-1");
      button.classList.toggle("is-active", selected);
    });
    if (formTitle) formTitle.textContent = `${file.label || active} Form`;
    setStatus(`Editing <code>${escapeHtml(file.filePath || "")}</code>. Your browser draft is private until you publish it.`, false);
    setWorkflow("edit");
    updateDraftUi();
  };

  const renderAll = () => {
    renderMeta();
    if (formMount) formMount.innerHTML = editors[active] ? editors[active]() : "";
    renderValidation();
    renderPreview();
    renderOutput();
  };

  const setUnlocked = (isUnlocked) => {
    if (lockPanel) lockPanel.hidden = isUnlocked;
    if (adminContent) adminContent.hidden = !isUnlocked;
    if (isUnlocked) {
      rememberUnlock();
      renderAll();
      const count = restoredDrafts.size;
      setStatus(count ? `Admin unlocked. Restored browser drafts for ${count} file(s).` : "Admin editor unlocked for this browser session.", false);
      return;
    }
    saveDraft(active);
    forgetUnlock();
    if (passwordInput) {
      passwordInput.value = "";
      window.setTimeout(() => passwordInput.focus(), 0);
    }
    setLockStatus("Enter the shared admin password to open the editor.", false);
  };

  const renderLivePanels = () => {
    renderValidation();
    renderPreview();
    renderOutput();
    updateDraftUi();
  };

  const moveItem = (items, index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return false;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
    return true;
  };

  const deleteItem = (items, index, label) => {
    if (!window.confirm(`Remove ${label}? You can still restore the currently published version.`)) return false;
    items.splice(index, 1);
    return true;
  };

  const handleFieldInput = (event) => {
    const target = event.target;
    if (!target.matches("[data-scope][data-field]")) return;
    const { scope, field: fieldName } = target.dataset;
    const index = Number(target.dataset.index);
    const linkIndex = Number(target.dataset.linkIndex);
    const value = target.value;
    const home = homeData();

    if (scope === "site-root") state.site[fieldName] = value;
    else if (scope === "site-home") home[fieldName] = value;
    else if (scope === "site-description") ensureArray(home, "descriptionParagraphs")[index] = value;
    else if (scope === "site-interest") ensureArray(home, "coreInterests")[index] = value;
    else if (scope === "site-cta") ensureArray(home, "ctas")[index][fieldName] = value;
    else if (scope === "site-card") ensureArray(home, "interestCards")[index][fieldName] = value;
    else if (scope === "members-root") state.members[fieldName] = value;
    else if (scope === "member") memberItems()[index][fieldName] = value;
    else if (scope === "member-image") {
      const member = memberItems()[index];
      if (!member.image) member.image = {};
      member.image[fieldName] = value;
    } else if (scope === "member-link") memberItems()[index].links[linkIndex][fieldName] = value;
    else if (scope === "news-root") state.news[fieldName] = value;
    else if (scope === "news-current") currentItems()[index][fieldName] = value;
    else if (scope === "news-archive") archiveItems()[index][fieldName] = value;
    else if (scope === "research-item") researchItems()[index][fieldName] = value;
    else if (scope === "contact-root") state.contact[fieldName] = value;
    else if (scope === "contact-invitation") ensureArray(state.contact, "invitationParagraphs")[index] = value;
    else if (scope === "contact-suggestion") ensureArray(state.contact, "suggestions")[index] = value;
    else if (scope === "companion-root") state.companion[fieldName] = value;
    else if (scope === "companion-pet") ensureArray(state.companion, "petMessages")[index] = value;
    else if (scope === "companion-thought") ensureArray(state.companion, "fetchedThoughts")[index] = value;

    setWorkflow("edit");
    renderLivePanels();
    queueDraftSave();
  };

  const listActions = {
    description: () => ensureArray(homeData(), "descriptionParagraphs"),
    interest: () => ensureArray(homeData(), "coreInterests"),
    cta: () => ensureArray(homeData(), "ctas"),
    "interest-card": () => ensureArray(homeData(), "interestCards"),
    member: memberItems,
    current: currentItems,
    archive: archiveItems,
    research: researchItems,
    "contact-invitation": () => ensureArray(state.contact, "invitationParagraphs"),
    "contact-suggestion": () => ensureArray(state.contact, "suggestions"),
    "companion-pet": () => ensureArray(state.companion, "petMessages"),
    "companion-thought": () => ensureArray(state.companion, "fetchedThoughts")
  };

  const newItems = {
    description: () => "",
    interest: () => "",
    cta: () => ({ label: "", url: "" }),
    "interest-card": () => ({ icon: "folder", iconLabel: "Folder icon", title: "", text: "" }),
    member: () => ({ name: "", role: "", institution: "", researchInterests: "", bio: "", links: [] }),
    current: () => ({ date: "", title: "", type: "", typeSlug: "", description: "", url: "", linkLabel: "" }),
    archive: () => ({ date: "", description: "" }),
    research: () => ({ title: "", description: "" }),
    "contact-invitation": () => "",
    "contact-suggestion": () => "",
    "companion-pet": () => "",
    "companion-thought": () => ""
  };

  const actionLabel = (prefix, index) => {
    const item = listActions[prefix]?.()[index];
    if (prefix === "member") return item?.name || `member ${index + 1}`;
    if (prefix === "current") return item?.title || `current item ${index + 1}`;
    if (prefix === "research" || prefix === "interest-card") return item?.title || `${prefix} ${index + 1}`;
    return `${prefix.replace(/-/g, " ")} ${index + 1}`;
  };

  const handleFormAction = (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    const linkIndex = Number(button.dataset.linkIndex);
    let changed = false;

    if (action === "add-link") {
      const member = memberItems()[index];
      if (!Array.isArray(member.links)) member.links = [];
      member.links.push({ label: "", url: "" });
      changed = true;
    } else if (action === "delete-link") {
      changed = deleteItem(memberItems()[index].links, linkIndex, `link ${linkIndex + 1}`);
    } else {
      const match = action.match(/^(add|delete|move)-(.+?)(?:-(up|down))?$/);
      if (match) {
        const [, verb, prefix, direction] = match;
        const getItems = listActions[prefix];
        const makeItem = newItems[prefix];
        if (verb === "add" && getItems && makeItem) {
          getItems().push(makeItem());
          changed = true;
        } else if (verb === "delete" && getItems) {
          changed = deleteItem(getItems(), index, actionLabel(prefix, index));
        } else if (verb === "move" && getItems) {
          changed = moveItem(getItems(), index, direction === "up" ? -1 : 1);
        }
      }
    }

    if (!changed) return;
    saveDraft(active);
    renderAll();
    setStatus("Change added to the browser draft.", false);
  };

  const copyJson = async (announce = true) => {
    const json = currentJson();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(json);
        if (announce) setStatus(`Copied <code>${escapeHtml(files[active]?.filePath || "")}</code> to the clipboard.`, false);
        return true;
      } catch (error) {
        // Use manual selection when the browser blocks clipboard writes.
      }
    }
    if (output) {
      output.focus();
      output.select();
    }
    setStatus("Clipboard access is unavailable here. The prepared file is selected for manual copying.", true);
    return false;
  };

  const downloadJson = () => {
    const file = files[active] || {};
    const blob = new Blob([currentJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.downloadName || `${active}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Downloaded <code>${escapeHtml(link.download)}</code> as a backup.`, false);
  };

  const restorePublished = () => {
    if (!isDirty(active)) return;
    const label = files[active]?.label || active;
    if (!window.confirm(`Discard the browser draft for ${label} and restore the version loaded from the public site?`)) return;
    state[active] = clone(publishedState[active]);
    try {
      window.localStorage.removeItem(draftStorageKey(active));
    } catch (error) {
      // The in-memory version is still restored when storage cannot be cleared.
    }
    draftSavedAt.delete(active);
    restoredDrafts.delete(active);
    renderAll();
    setStatus(`Restored the published ${escapeHtml(label)} content.`, false);
  };

  const handleAdminAction = async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.adminAction;

    if (action === "lock") {
      setUnlocked(false);
      return;
    }
    if (action === "restore") {
      restorePublished();
      return;
    }

    const messages = validateActive();
    if (action === "validate") {
      renderValidation();
      setWorkflow(messages.length ? "edit" : "github");
      setStatus(messages.length ? `${messages.length} validation issue(s) need attention.` : "Check complete. This file is ready to copy into GitHub.", messages.length > 0);
      return;
    }
    if (messages.length > 0) {
      renderValidation();
      setWorkflow("check");
      setStatus(`${messages.length} validation issue(s) need attention before publishing.`, true);
      return;
    }

    if (action === "copy") {
      await copyJson();
      setWorkflow("github");
    } else if (action === "download") {
      downloadJson();
      setWorkflow("github");
    } else if (action === "github") {
      const editUrl = files[active]?.editUrl;
      const popup = editUrl ? window.open(editUrl, "_blank", "noopener") : null;
      const copied = await copyJson(false);
      setWorkflow("commit");
      if (popup && copied) {
        setStatus("GitHub is open and the file is copied. Select all file contents there, paste, then press Commit changes.", false);
      } else if (!popup) {
        setStatus(`The file is copied. Open <a href="${escapeHtml(editUrl || "")}" target="_blank" rel="noopener">the GitHub editor</a>, replace its contents, and commit.`, true);
      }
    }
  };

  const activateTab = (button, focus = false) => {
    saveDraft(active);
    active = button.dataset.adminTab || "site";
    renderAll();
    if (focus) button.focus();
  };

  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button));
    button.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabButtons.length - 1;
      activateTab(tabButtons[nextIndex], true);
    });
  });

  formMount?.addEventListener("input", handleFieldInput);
  formMount?.addEventListener("change", handleFieldInput);
  formMount?.addEventListener("click", handleFormAction);
  editor.addEventListener("click", handleAdminAction);
  window.addEventListener("pagehide", () => saveDraft(active));

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = passwordInput?.value || "";
    try {
      const digest = await digestPassword(password);
      if (digest === adminPasswordHash) {
        setLockStatus("Password accepted.", false);
        setUnlocked(true);
      } else {
        setLockStatus("That password did not work.", true);
      }
    } catch (error) {
      setLockStatus(error.message || "Password checking is unavailable in this browser.", true);
    }
  });

  restoreBrowserDrafts();
  setUnlocked(hasStoredUnlock());
})();
