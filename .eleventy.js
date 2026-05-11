module.exports = function (eleventyConfig) {
  const parsePlainDate = (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value, options) => {
    const date = parsePlainDate(value);
    if (!date) {
      return value || "";
    }

    return new Intl.DateTimeFormat("en", options).format(date);
  };

  const slugify = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  eleventyConfig.addFilter("sortByDateDesc", (items) => {
    return [...items]
      .map((item, index) => ({ item, index, date: parsePlainDate(item.date) }))
      .sort((a, b) => {
        if (a.date && b.date) {
          return b.date - a.date;
        }

        if (!a.date && !b.date) {
          return a.index - b.index;
        }

        return a.date ? 1 : -1;
      })
      .map(({ item }) => item);
  });

  eleventyConfig.addFilter("isDate", (value) => Boolean(parsePlainDate(value)));

  eleventyConfig.addFilter("slugify", slugify);

  eleventyConfig.addFilter("newsTypeOptions", (items) => {
    const types = new Map();

    for (const item of items || []) {
      const label = item.type || item.typeSlug || "";
      const slug = slugify(item.typeSlug || label);

      if (slug && !types.has(slug)) {
        types.set(slug, label);
      }
    }

    return Array.from(types, ([slug, label]) => ({ slug, label }));
  });

  eleventyConfig.addFilter("readableDate", (value) => {
    return formatDate(value, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  });

  eleventyConfig.addFilter("shortDate", (value) => {
    return formatDate(value, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "docs"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
