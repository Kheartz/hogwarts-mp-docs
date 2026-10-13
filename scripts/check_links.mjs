import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
// The header links in docs.config.json name the public site absolutely, so they are checked as links into this build.
const siteHosts = new Set(["docs.hogwarts-mp.com"]);
const local = "http://local.invalid";

const pages = new Map();
const read = async (file) => {
  if (!pages.has(file)) pages.set(file, await readFile(file, "utf8").catch(() => null));
  return pages.get(file);
};

// The built file a site path is served from, or null when the build has none.
const resolveFile = async (pathname) => {
  const candidates = pathname.endsWith("/") ? [`${pathname}index.html`] : [pathname, `${pathname}/index.html`];
  for (const candidate of candidates) {
    const file = path.join(dist, ...candidate.split("/").filter(Boolean));
    if ((await read(file)) !== null) return file;
  }
  return null;
};

const decodeEntities = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The landing page and every guide page: the pages authored here, plus the header and footer links they carry.
const guideRoot = path.join(dist, "guides");
const sources = [path.join(dist, "index.html"), ...(await readdir(guideRoot, { recursive: true })).filter((file) => path.basename(file) === "index.html").map((file) => path.join(guideRoot, file))];

const broken = [];
for (const source of sources.sort()) {
  const html = await read(source);
  if (html === null) throw new Error(`${path.relative(root, source)} was not built; run pnpm build first`);
  const sourceRoute = `/${path.relative(dist, path.dirname(source)).split(path.sep).filter(Boolean).join("/")}/`.replace(/^\/\/$/, "/");
  for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*"([^"]*)"/gi)) {
    const href = decodeEntities(match[1]);
    if (!href || /^(?:mailto|tel|javascript):/i.test(href)) continue;
    const url = new URL(href, `${local}${sourceRoute}`);
    if (url.origin !== local && !(url.protocol === "https:" && siteHosts.has(url.host))) continue;
    const pathname = decodeURIComponent(url.pathname);
    const target = await resolveFile(pathname);
    let problem = target ? null : "no such page";
    if (target && url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!new RegExp(`\\sid\\s*=\\s*"${escapeRegExp(id)}"`).test(await read(target))) problem = `no #${id} on that page`;
    }
    if (problem) broken.push(`${sourceRoute} → ${href}: ${problem}`);
  }
}

const unique = [...new Set(broken)];
for (const line of unique) console.error(line);
if (unique.length) {
  console.error(`\n${unique.length} broken link${unique.length === 1 ? "" : "s"} in ${sources.length} pages.`);
  process.exitCode = 1;
} else console.log(`Every link and anchor on ${sources.length} pages resolves.`);
