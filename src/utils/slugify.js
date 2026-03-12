/**
 * Generate a URL-friendly slug from a string.
 * Appends a short random suffix to ensure uniqueness.
 */
const slugify = (text) => {
  const base = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
};

export default slugify;
