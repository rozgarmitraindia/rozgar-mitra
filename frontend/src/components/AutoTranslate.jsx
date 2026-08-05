import { useEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";

/**
 * AutoTranslate
 * Wraps any part of the app and keeps its text in sync with the site
 * language (English / Hindi), in BOTH directions:
 *  - Text that was originally written in English gets translated to
 *    Hindi when lang === "hi".
 *  - Text that was hardcoded in Hindi (e.g. hero headings written
 *    directly in Devanagari) gets translated to English when
 *    lang === "en".
 *
 * The very first text captured for each node/attribute is remembered as
 * its "true original". Every language switch re-translates FROM that
 * true original TO the target language (never chains translations on
 * top of a previous translation), so quality doesn't degrade over
 * repeated toggles. Results are cached in localStorage.
 */

const CACHE_KEY = "rm_translate_cache_v2";
let cache = {};
try {
  cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
} catch {
  cache = {};
}
function persistCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
}

const originalTextMap = new WeakMap(); // text node -> true original text
const originalAttrMap = new WeakMap(); // element -> { attr: true original value }

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
const ATTRS_TO_TRANSLATE = ["placeholder", "title", "aria-label"];

const DEVANAGARI_RE = /[\u0900-\u097F]/;
function detectLang(text) {
  return DEVANAGARI_RE.test(text) ? "hi" : "en";
}

function isTranslatable(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // Skip strings that are purely numbers / currency / symbols / punctuation
  if (/^[\d\s.,:%₹+\-#()/x×]*$/i.test(trimmed)) return false;
  return true;
}

async function fetchTranslation(text, sourceLang, targetLang) {
  const key = `${sourceLang}|${targetLang}:${text}`;
  if (cache[key]) return cache[key];
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated.toLowerCase() !== "invalid") {
      cache[key] = translated;
      persistCache();
      return translated;
    }
  } catch (err) {
    console.error("AutoTranslate: translation request failed", err);
  }
  return text;
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

async function translateNode(node, targetLang) {
  if (!originalTextMap.has(node)) {
    if (!isTranslatable(node.nodeValue)) return;
    originalTextMap.set(node, node.nodeValue);
  }
  const original = originalTextMap.get(node);
  if (!isTranslatable(original)) return;

  const sourceLang = detectLang(original);
  const leading = original.match(/^\s*/)[0];
  const trailing = original.match(/\s*$/)[0];

  if (sourceLang === targetLang) {
    node.nodeValue = original;
    return;
  }
  const translated = await fetchTranslation(original.trim(), sourceLang, targetLang);
  node.nodeValue = leading + translated + trailing;
}

async function translateAttrsOn(el, targetLang) {
  for (const attr of ATTRS_TO_TRANSLATE) {
    if (!el.hasAttribute(attr)) continue;
    if (!originalAttrMap.has(el)) originalAttrMap.set(el, {});
    const store = originalAttrMap.get(el);
    if (!(attr in store)) store[attr] = el.getAttribute(attr);
    const original = store[attr];
    if (!isTranslatable(original)) continue;

    const sourceLang = detectLang(original);
    if (sourceLang === targetLang) {
      el.setAttribute(attr, original);
      continue;
    }
    const translated = await fetchTranslation(original.trim(), sourceLang, targetLang);
    el.setAttribute(attr, translated);
  }
}

async function translateSubtree(root, targetLang) {
  const textNodes = collectTextNodes(root);
  const BATCH = 10;
  for (let i = 0; i < textNodes.length; i += BATCH) {
    await Promise.all(textNodes.slice(i, i + BATCH).map((n) => translateNode(n, targetLang)));
  }
  const attrEls = root.querySelectorAll
    ? root.querySelectorAll("[placeholder],[title],[aria-label]")
    : [];
  for (const el of attrEls) await translateAttrsOn(el, targetLang);
  if (root.nodeType === Node.ELEMENT_NODE) {
    if (root.hasAttribute?.("placeholder") || root.hasAttribute?.("title") || root.hasAttribute?.("aria-label")) {
      await translateAttrsOn(root, targetLang);
    }
  }
}

export default function AutoTranslate({ children }) {
  const { lang } = useLanguage();
  const rootRef = useRef(null);

  // Translate whenever the language toggles.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    translateSubtree(root, lang);
  }, [lang]);

  // Keep translating newly-mounted content (route changes, async data,
  // opened dropdowns/modals) to match the current language.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateSubtree(node, lang);
          } else if (node.nodeType === Node.TEXT_NODE) {
            translateNode(node, lang);
          }
        });
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);

  return (
    <div ref={rootRef} data-autotranslate-root>
      {children}
    </div>
  );
}