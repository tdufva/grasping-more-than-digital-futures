module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  eleventyConfig.addFilter("sortByDateDesc", (items) => {
    return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  eleventyConfig.addFilter("readableDate", (value) => {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(`${value}T00:00:00`));
  });

  eleventyConfig.addFilter("shortDate", (value) => {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(`${value}T00:00:00`));
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
