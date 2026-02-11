// header.js
// Inserts header.html DOM into the page and provides search functionality that queries data/pokedex.json.
// Usage: include <link rel="stylesheet" href="header.css"> and <script src="header.js" defer></script> in each page.

/* Global store for pokedex entries used by the search box */
window._searchPokedex = null;

function normalizeName(n) {
  return (n || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadSearchPokedex() {
  if (window._searchPokedex) return window._searchPokedex;
  try {
    const res = await fetch("data/pokedex.json");
    if (!res.ok) throw new Error("pokedex.json fetch failed");
    window._searchPokedex = await res.json();
    return window._searchPokedex;
  } catch (e) {
    console.warn("Header search: could not load pokedex.json:", e);
    window._searchPokedex = {};
    return window._searchPokedex;
  }
}

function renderSearchResults(matches) {
  const box = document.getElementById("search-results");
  if (!box) return;
  if (!matches || matches.length === 0) {
    box.style.display = "none";
    box.innerHTML = "";
    box.setAttribute("aria-hidden", "true");
    return;
  }
  box.innerHTML = matches.map(name => `<div class="result" data-name="${encodeURIComponent(name)}">${name}</div>`).join("");
  // Add click handlers
  box.querySelectorAll(".result").forEach(el => {
    el.addEventListener("click", e => {
      const name = decodeURIComponent(el.dataset.name);
      window.location.href = `pokemon.html?name=${encodeURIComponent(name)}`;
    });
  });
  box.style.display = "block";
  box.setAttribute("aria-hidden", "false");
}

let _searchDebounceTimer = null;
function searchPokemon() {
  const qEl = document.getElementById("search");
  const box = document.getElementById("search-results");
  if (!qEl || !box) return;

  // Debounce quick typing
  if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(async () => {
    const raw = qEl.value.trim().toLowerCase();
    if (!raw) {
      renderSearchResults(null);
      return;
    }
    const pokedex = await loadSearchPokedex();
    const names = Object.keys(pokedex || {});
    const matches = names.filter(name => name.toLowerCase().includes(raw)).slice(0, 15);
    renderSearchResults(matches);
  }, 120);
}

function setActiveHeaderLink() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  // Clear all active classes first
  ["link-info","link-pokedex","link-moves","link-locations","link-abilities"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });
  if (path.startsWith("info")) {
    const el = document.getElementById("link-info"); if (el) el.classList.add("active");
  } else if (path.startsWith("index") || path === "" ) {
    const el = document.getElementById("link-pokedex"); if (el) el.classList.add("active");
  } else if (path.startsWith("moves") || path.startsWith("movedescriptions")) {
    const el = document.getElementById("link-moves"); if (el) el.classList.add("active");
  } else if (path.startsWith("locations") || path.startsWith("trainer") || path.startsWith("trainers") || path.startsWith("encounters")) {
    const el = document.getElementById("link-locations"); if (el) el.classList.add("active");
  } else if (path.startsWith("abilities")) {
    const el = document.getElementById("link-abilities"); if (el) el.classList.add("active");
  } else {
    // if on other pages, highlight pokedex tab by default
    const el = document.getElementById("link-pokedex"); if (el) el.classList.add("active");
  }
}

function installHeaderFromFile() {
  // If the header is already present, don't duplicate.
  if (document.getElementById("site-header")) {
    setActiveHeaderLink();
    return Promise.resolve();
  }
  // Try to fetch header.html and insert it as top child of body
  return fetch("header.html")
    .then(res => {
      if (!res.ok) throw new Error("header.html not found");
      return res.text();
    })
    .then(html => {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const header = temp.firstElementChild;
      if (!header) return;
      // Prepend so header sits before all other content
      document.body.insertBefore(header, document.body.firstChild);

      // If page content might be under the fixed header, ensure pages have top padding
      const currentPadding = parseInt(window.getComputedStyle(document.body).paddingTop || "0", 10);
      const headerHeight = header.getBoundingClientRect().height || 68;
      if (currentPadding < headerHeight) {
        document.body.style.paddingTop = (headerHeight + 8) + "px";
      }

      // Wire up search input and clicks
      const qEl = document.getElementById("search");
      if (qEl) {
        qEl.addEventListener("input", searchPokemon);
        qEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const first = document.querySelector("#search-results .result");
            if (first) {
              first.click();
            } else {
              const val = qEl.value.trim();
              if (val) window.location.href = `pokemon.html?name=${encodeURIComponent(val)}`;
            }
          }
        });
      }
      // Click-away to close results
      document.addEventListener("click", (ev) => {
        const box = document.getElementById("search-results");
        const q = document.getElementById("search");
        if (!box || !q) return;
        if (!box.contains(ev.target) && ev.target !== q) {
          box.style.display = "none";
        }
      });

      setActiveHeaderLink();
    })
    .catch(err => {
      // If header.html isn't available, fallback: build header DOM inline (minimal)
      console.warn("Could not fetch header.html:", err);
      const fallback = document.createElement("div");
      fallback.id = "site-header";
      fallback.className = "header";
      fallback.innerHTML = `
        <a href="index.html">Pokédex</a>
        <a href="moves.html">Moves</a>
        <a href="trainers.html">Trainers</a>
        <div style="margin-left:auto; position:relative;">
          <input id="search" type="text" placeholder="Search Pokémon..." autocomplete="off" />
          <div id="search-results" class="search-results" aria-hidden="true"></div>
        </div>
      `;
      document.body.insertBefore(fallback, document.body.firstChild);
      const qEl = document.getElementById("search");
      if (qEl) qEl.addEventListener("input", searchPokemon);
      setActiveHeaderLink();
    });
}

// Initialize once DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  await installHeaderFromFile();
  // Preload pokedex for search
  await loadSearchPokedex();
  // Expose search function globally (used by inline oninput if any)
  window.searchPokemon = searchPokemon;
});
