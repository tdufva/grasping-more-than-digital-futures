(function () {
  const editor = document.querySelector("[data-admin-editor]");
  if (!editor) return;

  const clone = (value) => JSON.parse(JSON.stringify(value || {}));
  const parseJsonScript = (id, fallback) => {
    const element = document.getElementById(id);
    if (!element) return clone(fallback);

    try {
      return JSON.parse(element.textContent || "null") || clone(fallback);
    } catch (error) {
      return clone(fallback);
    }
  };

  const files = parseJsonScript("admin-file-config", {});
  const state = {
    members: clone(parseJsonScript("admin-members-data", { intro: "", heading: "", items: [] })),
    news: clone(parseJsonScript("admin-news-data", { intro: "", current: [], archive: [] }))
  };

  let active = "members";

  const formTitle = editor.querySelector("[data-admin-form-title]");
  const formMount = editor.querySelector("[data-admin-form]");
  const previewMount = editor.querySelector("[data-admin-preview]");
  const validationMount = editor.querySelector("[data-admin-validation]");
  const output = editor.querySelector("[data-admin-output]");
  const status = editor.querySelector("[data-admin-status]");
  const tabButtons = Array.from(editor.querySelectorAll("[data-admin-tab]"));

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

  const setStatus = (message, isError) => {
    if (!status) return;
    status.innerHTML = message;
    status.dataset.state = isError ? "error" : "ok";
  };

  const field = ({ label, value, scope, name, index, linkIndex, textarea, type = "text", wide, hint }) => {
    const common = [
      `data-scope="${escapeHtml(scope)}"`,
      `data-field="${escapeHtml(name)}"`,
      typeof index === "number" ? `data-index="${index}"` : "",
      typeof linkIndex === "number" ? `data-link-index="${linkIndex}"` : ""
    ].filter(Boolean).join(" ");
    const className = `admin-field${wide ? " admin-field-wide" : ""}`;
    const hintText = hint ? `<small>${escapeHtml(hint)}</small>` : "";

    if (textarea) {
      return `<label class="${className}"><span>${escapeHtml(label)}</span><textarea ${common} rows="4">${escapeHtml(value)}</textarea>${hintText}</label>`;
    }

    return `<label class="${className}"><span>${escapeHtml(label)}</span><input ${common} type="${escapeHtml(type)}" value="${escapeHtml(value)}">${hintText}</label>`;
  };

  const compactField = ({ label, value, scope, name, index, linkIndex }) => field({
    label,
    value,
    scope,
    name,
    index,
    linkIndex,
    wide: true
  });

  const actionButton = (label, action, index, extra = "") => (
    `<button class="classic-button small" type="button" data-action="${action}"${typeof index === "number" ? ` data-index="${index}"` : ""}${extra}>${escapeHtml(label)}</button>`
  );

  const memberItems = () => {
    if (!Array.isArray(state.members.items)) state.members.items = [];
    return state.members.items;
  };

  const currentItems = () => {
    if (!Array.isArray(state.news.current)) state.news.current = [];
    return state.news.current;
  };

  const archiveItems = () => {
    if (!Array.isArray(state.news.archive)) state.news.archive = [];
    return state.news.archive;
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
      .map((link) => ({
        label: String(link.label || "").trim(),
        url: String(link.url || "").trim()
      }))
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

  const cleanForOutput = () => {
    if (active === "members") {
      return {
        intro: String(state.members.intro || "").trim(),
        heading: String(state.members.heading || "").trim(),
        items: memberItems().map(cleanMember)
      };
    }

    return {
      intro: String(state.news.intro || "").trim(),
      current: currentItems().map(cleanNewsItem),
      archive: archiveItems().map(cleanArchiveItem)
    };
  };

  const currentJson = () => `${JSON.stringify(cleanForOutput(), null, 2)}\n`;

  const validateMembers = () => {
    const messages = [];
    if (!String(state.members.intro || "").trim()) messages.push("Members intro is required.");
    if (!String(state.members.heading || "").trim()) messages.push("Members heading is required.");
    if (memberItems().length === 0) messages.push("Add at least one member.");

    memberItems().forEach((member, index) => {
      const label = member.name || `Member ${index + 1}`;
      ["name", "role", "institution", "researchInterests", "bio"].forEach((key) => {
        if (!String(member[key] || "").trim()) messages.push(`${label}: ${key} is required.`);
      });

      if (member.image?.src && !member.image?.alt) {
        messages.push(`${label}: image alt text is required when an image source is set.`);
      }

      (member.links || []).forEach((link, linkIndex) => {
        if ((link.label || link.url) && (!link.label || !link.url)) {
          messages.push(`${label}: link ${linkIndex + 1} needs both label and URL.`);
        }
      });
    });

    return messages;
  };

  const validateNews = () => {
    const messages = [];
    if (!String(state.news.intro || "").trim()) messages.push("News intro is required.");

    currentItems().forEach((item, index) => {
      const label = item.title || `Current item ${index + 1}`;
      ["date", "title", "type", "description"].forEach((key) => {
        if (!String(item[key] || "").trim()) messages.push(`${label}: ${key} is required.`);
      });
    });

    archiveItems().forEach((item, index) => {
      const label = `Archive item ${index + 1}`;
      ["date", "description"].forEach((key) => {
        if (!String(item[key] || "").trim()) messages.push(`${label}: ${key} is required.`);
      });
    });

    return messages;
  };

  const validateActive = () => active === "members" ? validateMembers() : validateNews();

  const renderValidation = () => {
    if (!validationMount) return;
    const messages = validateActive();
    validationMount.innerHTML = messages.length
      ? messages.map((message) => `<li class="admin-validation-error">${escapeHtml(message)}</li>`).join("")
      : `<li class="admin-validation-ok">Required fields look complete.</li>`;
  };

  const renderMembersEditor = () => {
    const items = memberItems();
    const itemHtml = items.map((member, index) => {
      if (!Array.isArray(member.links)) member.links = [];
      if (!member.image) member.image = {};

      const links = member.links.map((link, linkIndex) => `
        <div class="admin-link-row">
          ${compactField({ label: "Label", value: link.label, scope: "member-link", name: "label", index, linkIndex })}
          ${compactField({ label: "URL", value: link.url, scope: "member-link", name: "url", index, linkIndex })}
          <button class="classic-button small" type="button" data-action="delete-link" data-index="${index}" data-link-index="${linkIndex}">Remove Link</button>
        </div>
      `).join("");

      return `
        <fieldset class="admin-item">
          <legend>Member ${index + 1}</legend>
          <div class="admin-item-actions">
            ${actionButton("Move Up", "move-member-up", index)}
            ${actionButton("Move Down", "move-member-down", index)}
            ${actionButton("Remove", "delete-member", index)}
          </div>
          <div class="admin-field-grid">
            ${field({ label: "Name", value: member.name, scope: "member", name: "name", index })}
            ${field({ label: "Role", value: member.role, scope: "member", name: "role", index })}
            ${field({ label: "Institution", value: member.institution, scope: "member", name: "institution", index, wide: true })}
            ${field({ label: "Research interests", value: member.researchInterests, scope: "member", name: "researchInterests", index, textarea: true, wide: true })}
            ${field({ label: "Short bio", value: member.bio, scope: "member", name: "bio", index, textarea: true, wide: true })}
          </div>
          <details class="admin-details" open>
            <summary>Portrait image</summary>
            <div class="admin-field-grid">
              ${field({ label: "Image path", value: member.image.src, scope: "member-image", name: "src", index, wide: true, hint: "Example: assets/images/members/name.jpg" })}
              ${field({ label: "Alt text", value: member.image.alt, scope: "member-image", name: "alt", index, wide: true })}
              ${field({ label: "Width", value: member.image.width, scope: "member-image", name: "width", index })}
              ${field({ label: "Height", value: member.image.height, scope: "member-image", name: "height", index })}
            </div>
          </details>
          <details class="admin-details" open>
            <summary>Links</summary>
            <div class="admin-link-list">
              ${links || `<p class="system-note">No links yet.</p>`}
            </div>
            ${actionButton("Add Link", "add-link", index)}
          </details>
        </fieldset>
      `;
    }).join("");

    return `
      <div class="admin-form-stack">
        ${field({ label: "Members intro", value: state.members.intro, scope: "members-root", name: "intro", textarea: true, wide: true })}
        ${field({ label: "Members heading", value: state.members.heading, scope: "members-root", name: "heading", wide: true })}
        <div class="admin-section-title">
          <h3>Member Cards</h3>
          ${actionButton("Add Member", "add-member")}
        </div>
        ${itemHtml}
      </div>
    `;
  };

  const renderNewsItemFields = (item, index, scope, archive) => {
    if (archive) {
      return `
        <div class="admin-field-grid">
          ${field({ label: "Date", value: item.date, scope, name: "date", index, hint: "Use YYYY-MM-DD or TBA." })}
          ${field({ label: "Description", value: item.description, scope, name: "description", index, textarea: true, wide: true })}
        </div>
      `;
    }

    return `
      <div class="admin-field-grid">
        ${field({ label: "Date", value: item.date, scope, name: "date", index, hint: "Use YYYY-MM-DD or TBA." })}
        ${field({ label: "Title", value: item.title, scope, name: "title", index })}
        ${field({ label: "Type", value: item.type, scope, name: "type", index })}
        ${field({ label: "Type slug", value: item.typeSlug, scope, name: "typeSlug", index, hint: "Optional; generated from type if left blank." })}
        ${field({ label: "Description", value: item.description, scope, name: "description", index, textarea: true, wide: true })}
        ${field({ label: "Link URL", value: item.url, scope, name: "url", index, wide: true })}
        ${field({ label: "Link label", value: item.linkLabel, scope, name: "linkLabel", index })}
      </div>
    `;
  };

  const renderNewsEditor = () => {
    const currentHtml = currentItems().map((item, index) => `
      <fieldset class="admin-item">
        <legend>Current item ${index + 1}</legend>
        <div class="admin-item-actions">
          ${actionButton("Move Up", "move-current-up", index)}
          ${actionButton("Move Down", "move-current-down", index)}
          ${actionButton("Remove", "delete-current", index)}
        </div>
        ${renderNewsItemFields(item, index, "news-current", false)}
      </fieldset>
    `).join("");

    const archiveHtml = archiveItems().map((item, index) => `
      <fieldset class="admin-item">
        <legend>Archive item ${index + 1}</legend>
        <div class="admin-item-actions">
          ${actionButton("Move Up", "move-archive-up", index)}
          ${actionButton("Move Down", "move-archive-down", index)}
          ${actionButton("Remove", "delete-archive", index)}
        </div>
        ${renderNewsItemFields(item, index, "news-archive", true)}
      </fieldset>
    `).join("");

    return `
      <div class="admin-form-stack">
        ${field({ label: "News intro", value: state.news.intro, scope: "news-root", name: "intro", textarea: true, wide: true })}
        <div class="admin-section-title">
          <h3>Current News + Events</h3>
          ${actionButton("Add Current Item", "add-current")}
        </div>
        ${currentHtml || `<p class="system-note">No current items yet.</p>`}
        <div class="admin-section-title">
          <h3>Archive</h3>
          ${actionButton("Add Archive Item", "add-archive")}
        </div>
        ${archiveHtml || `<p class="system-note">No archive items yet.</p>`}
      </div>
    `;
  };

  const renderMemberPreview = () => {
    const cards = memberItems().map((member) => {
      const image = member.image?.src
        ? `<figure class="member-portrait"><img src="${escapeHtml(siteAssetUrl(member.image.src))}" alt="${escapeHtml(member.image.alt || `Portrait of ${member.name || "member"}`)}"></figure>`
        : `<figure class="member-portrait"><span class="member-portrait-placeholder" role="img" aria-label="Portrait placeholder"></span></figure>`;
      const links = (member.links || [])
        .filter((link) => link.label || link.url)
        .map((link) => `<a href="${escapeHtml(link.url || "#")}">${escapeHtml(link.label || "Link")}</a>`)
        .join(`<span aria-hidden="true">|</span>`);

      return `
        <article class="admin-preview-card">
          <h4>${escapeHtml(member.name || "Unnamed member")}</h4>
          ${image}
          <dl class="profile-list">
            <dt>Role</dt><dd>${escapeHtml(member.role || "")}</dd>
            <dt>Institution</dt><dd>${escapeHtml(member.institution || "")}</dd>
            <dt>Research interests</dt><dd>${escapeHtml(member.researchInterests || "")}</dd>
          </dl>
          <p>${escapeHtml(member.bio || "")}</p>
          ${links ? `<p class="profile-links">${links}</p>` : ""}
        </article>
      `;
    }).join("");

    return `<div class="admin-preview-list">${cards || `<p class="system-note">No members to preview yet.</p>`}</div>`;
  };

  const renderNewsPreview = () => {
    const current = currentItems().map((item) => `
      <article class="admin-preview-card">
        <p class="item-meta">${escapeHtml(item.date || "")} · ${escapeHtml(item.type || "")}</p>
        <h4>${escapeHtml(item.title || "Untitled item")}</h4>
        <p>${escapeHtml(item.description || "")}</p>
        ${item.url ? `<a class="text-link" href="${escapeHtml(item.url)}">${escapeHtml(item.linkLabel || "Link")}</a>` : ""}
      </article>
    `).join("");

    const archive = archiveItems().map((item) => `
      <li><strong>${escapeHtml(item.date || "")}</strong> · ${escapeHtml(item.description || "")}</li>
    `).join("");

    return `
      <div class="admin-preview-list">
        ${current || `<p class="system-note">No current items to preview yet.</p>`}
        <div class="admin-archive-preview">
          <h4>Archive</h4>
          <ul class="compact-list">${archive || `<li>No archive items yet.</li>`}</ul>
        </div>
      </div>
    `;
  };

  const renderPreview = () => {
    if (!previewMount) return;
    previewMount.innerHTML = active === "members" ? renderMemberPreview() : renderNewsPreview();
  };

  const renderOutput = () => {
    if (output) output.value = currentJson();
  };

  const renderMeta = () => {
    const file = files[active] || {};
    tabButtons.forEach((button) => {
      const selected = button.dataset.adminTab === active;
      button.setAttribute("aria-selected", String(selected));
      button.classList.toggle("is-active", selected);
    });
    if (formTitle) formTitle.textContent = `${file.label || active} Form`;
    setStatus(`Ready to edit <code>${escapeHtml(file.filePath || "")}</code>.`, false);
  };

  const renderAll = () => {
    renderMeta();
    if (formMount) formMount.innerHTML = active === "members" ? renderMembersEditor() : renderNewsEditor();
    renderValidation();
    renderPreview();
    renderOutput();
  };

  const renderLivePanels = () => {
    renderValidation();
    renderPreview();
    renderOutput();
  };

  const moveItem = (items, index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  };

  const handleFieldInput = (event) => {
    const target = event.target;
    if (!target.matches("[data-scope][data-field]")) return;

    const { scope, field: fieldName } = target.dataset;
    const index = Number(target.dataset.index);
    const linkIndex = Number(target.dataset.linkIndex);
    const value = target.value;

    if (scope === "members-root") {
      state.members[fieldName] = value;
    } else if (scope === "member") {
      memberItems()[index][fieldName] = value;
    } else if (scope === "member-image") {
      const member = memberItems()[index];
      if (!member.image) member.image = {};
      member.image[fieldName] = value;
    } else if (scope === "member-link") {
      const member = memberItems()[index];
      if (!Array.isArray(member.links)) member.links = [];
      member.links[linkIndex][fieldName] = value;
    } else if (scope === "news-root") {
      state.news[fieldName] = value;
    } else if (scope === "news-current") {
      currentItems()[index][fieldName] = value;
    } else if (scope === "news-archive") {
      archiveItems()[index][fieldName] = value;
    }

    renderLivePanels();
  };

  const handleFormAction = (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    const linkIndex = Number(button.dataset.linkIndex);

    if (action === "add-member") {
      memberItems().push({ name: "", role: "", institution: "", researchInterests: "", bio: "", links: [] });
    } else if (action === "delete-member") {
      memberItems().splice(index, 1);
    } else if (action === "move-member-up") {
      moveItem(memberItems(), index, -1);
    } else if (action === "move-member-down") {
      moveItem(memberItems(), index, 1);
    } else if (action === "add-link") {
      const member = memberItems()[index];
      if (!Array.isArray(member.links)) member.links = [];
      member.links.push({ label: "", url: "" });
    } else if (action === "delete-link") {
      memberItems()[index].links.splice(linkIndex, 1);
    } else if (action === "add-current") {
      currentItems().push({ date: "", title: "", type: "", typeSlug: "", description: "", url: "", linkLabel: "" });
    } else if (action === "delete-current") {
      currentItems().splice(index, 1);
    } else if (action === "move-current-up") {
      moveItem(currentItems(), index, -1);
    } else if (action === "move-current-down") {
      moveItem(currentItems(), index, 1);
    } else if (action === "add-archive") {
      archiveItems().push({ date: "", description: "" });
    } else if (action === "delete-archive") {
      archiveItems().splice(index, 1);
    } else if (action === "move-archive-up") {
      moveItem(archiveItems(), index, -1);
    } else if (action === "move-archive-down") {
      moveItem(archiveItems(), index, 1);
    }

    renderAll();
  };

  const copyJson = async () => {
    const json = currentJson();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(json);
        setStatus(`Copied <code>${escapeHtml(files[active]?.filePath || "")}</code> JSON to the clipboard.`, false);
        return;
      } catch (error) {
        // Fall through to manual selection when the browser blocks clipboard writes.
      }
    }

    if (output) {
      output.focus();
      output.select();
    }
    setStatus("Clipboard access is unavailable here. The generated JSON is selected for manual copying.", true);
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
    setStatus(`Downloaded <code>${escapeHtml(link.download)}</code>.`, false);
  };

  const handleAdminAction = async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const action = button.dataset.adminAction;
    const messages = validateActive();

    if (action === "validate") {
      renderValidation();
      setStatus(messages.length ? `${messages.length} validation issue(s) need attention.` : "Required fields look complete.", messages.length > 0);
      return;
    }

    if (messages.length > 0) {
      renderValidation();
      setStatus(`${messages.length} validation issue(s) need attention before exporting.`, true);
      return;
    }

    if (action === "copy") {
      await copyJson();
    } else if (action === "download") {
      downloadJson();
    } else if (action === "github") {
      const editUrl = files[active]?.editUrl;
      const popup = editUrl ? window.open(editUrl, "_blank", "noopener") : null;
      await copyJson();
      setStatus(`JSON copied. In GitHub, replace the file contents, commit the change, and GitHub Actions will publish it.`, false);
      if (!popup) {
        setStatus(`JSON copied. Open the GitHub editor manually: <a href="${escapeHtml(editUrl || "#")}">edit ${escapeHtml(files[active]?.filePath || "file")}</a>.`, true);
      }
    }
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.adminTab || "members";
      renderAll();
    });
  });

  formMount?.addEventListener("input", handleFieldInput);
  formMount?.addEventListener("change", handleFieldInput);
  formMount?.addEventListener("click", handleFormAction);
  editor.addEventListener("click", handleAdminAction);

  renderAll();
})();
