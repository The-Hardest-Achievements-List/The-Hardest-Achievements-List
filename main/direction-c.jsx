(function () {
  const { useState } = React;

  const DirectionC = () => {
    const [active, setActive] = useState("MAIN");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("rank");
    const [mode, setMode] = useState("classic");
    const [activeTags, setActiveTags] = useState(new Set(["Level"]));

    const tabs = ["MAIN", "PENDING", "REMOVED", "TIMELINE"];

    const toggleTag = (t) => {
      const next = new Set(activeTags);
      next.has(t) ? next.delete(t) : next.add(t);
      setActiveTags(next);
    };

    return (
      <div className="dirC">
        <style>{dirCStyles}</style>

        {}
        <div className="dirC__bg">
          <div
            className="dirC__bg-img"
            style={{ backgroundImage: `url(${window.THAL_DATA[0].thumbnail})` }}
          />
          <div className="dirC__bg-tint" />
          <div className="dirC__bg-grid" />
        </div>

        {}
        <header className="dirC__hd">
          <div className="dirC__hd-row">
            <div className="dirC__brand">
              <div className="dirC__logo">
                <span className="dirC__logo-mark">▸</span>
                <span className="dirC__logo-text">THAL</span>
              </div>
              <div className="dirC__brand-meta">
                <div className="dirC__brand-title">Hardest Achievements</div>
                <div className="dirC__brand-sub">
                  847 entries · updated 3h ago
                </div>
              </div>
            </div>

            <nav className="dirC__nav">
              {tabs.map((t) => (
                <button
                  key={t}
                  className={
                    "dirC__nav-btn " + (active === t ? "is-active" : "")
                  }
                  onClick={() => setActive(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          <div className="dirC__controls">
            <div className="dirC__search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, player, level ID"
              />
              <kbd>⌘K</kbd>
            </div>

            <div className="dirC__sort-group">
              <span className="dirC__sort-lbl">SORT</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="rank">Rank</option>
                <option value="name">Name</option>
                <option value="length">Length</option>
                <option value="date">Date</option>
              </select>
              <button className="dirC__sort-dir">↑</button>
            </div>

            <div className="dirC__mode-toggle">
              <button
                className={mode === "classic" ? "is-active" : ""}
                onClick={() => setMode("classic")}
              >
                Classic
              </button>
              <button
                className={mode === "platformer" ? "is-active" : ""}
                onClick={() => setMode("platformer")}
              >
                Platformer
              </button>
              <span className="dirC__mode-thumb" data-mode={mode} />
            </div>
          </div>

          {}
          <div className="dirC__filters">
            <span className="dirC__fgroup-lbl">FILTER</span>
            <div className="dirC__chips">
              {window.THAL_ALL_TAGS.map((t) => (
                <button
                  key={t}
                  className={"dirC__chip " + (activeTags.has(t) ? "is-on" : "")}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </header>

        {}
        <div className="dirC__resultmeta">
          <span className="dirC__count">
            <strong>10</strong> of <strong>847</strong>
          </span>
          <span className="dirC__filter-summary">
            {[...activeTags].map((t) => (
              <span key={t} className="dirC__active-tag">
                {t}
                <button onClick={() => toggleTag(t)}>✕</button>
              </span>
            ))}
          </span>
        </div>

        {}
        <main className="dirC__list">
          {window.THAL_DATA.map((a, i) => (
            <article
              key={a.rank}
              className={"dirC__card " + (i < 3 ? "is-podium" : "")}
              data-podium={i + 1}
            >
              {}
              <div className="dirC__content">
                {}
                <div className="dirC__rank">
                  <span className="dirC__rank-num">{a.rank}</span>
                  {i === 0 && (
                    <span className="dirC__rank-pin">#1 HARDEST</span>
                  )}
                </div>

                <div className="dirC__detail">
                  <div className="dirC__detail-top">
                    <h2 className="dirC__name">{a.name}</h2>
                    <div className="dirC__player">
                      <span className="dirC__player-by">by</span>
                      <span className="dirC__player-name">{a.player}</span>
                    </div>
                  </div>

                  <div className="dirC__detail-bottom">
                    <div className="dirC__stats">
                      <div>
                        <span className="lbl">LEN</span>
                        <span className="val">
                          {a.length}
                          <i>s</i>
                        </span>
                      </div>
                      <div>
                        <span className="lbl">DATE</span>
                        <span className="val">{formatDateC(a.date)}</span>
                      </div>
                      <div>
                        <span className="lbl">VER</span>
                        <span className="val">2.2</span>
                      </div>
                    </div>

                    <div className="dirC__cardtags">
                      {a.tags.map((t) => (
                        <span key={t} className="dirC__cardtag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="dirC__open">↗</button>
              </div>

              {}
              <div className="dirC__thumb">
                <img src={a.thumbnail} alt="" loading="lazy" />
                <div className="dirC__thumb-fade" />
                <div className="dirC__thumb-corner">
                  <span>LVL.ID</span>
                  <strong>{a.levelID}</strong>
                </div>
              </div>
            </article>
          ))}
        </main>
      </div>
    );
  };

  const formatDateC = (iso) => {
    const d = new Date(iso);
    const m = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ][d.getMonth()];
    return `${d.getDate()} ${m} ${String(d.getFullYear()).slice(2)}`;
  };

  const dirCStyles = `
.dirC {
  --bg: oklch(15% 0.005 260);
  --bg-2: oklch(18% 0.008 260);
  --bg-3: oklch(22% 0.010 260);
  --line: oklch(28% 0.010 260);
  --line-2: oklch(35% 0.012 260);
  --ink: oklch(96% 0.005 260);
  --ink-2: oklch(72% 0.008 260);
  --ink-3: oklch(52% 0.010 260);
  --ink-4: oklch(38% 0.010 260);
  --acc: oklch(78% 0.13 75);
  --acc-2: oklch(70% 0.13 75);
  --acc-soft: oklch(78% 0.13 75 / 0.15);
  --sans: "Inter Tight", "Inter", -apple-system, system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  position: relative;
  min-height: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  padding-bottom: 60px;
  overflow: hidden;
}
.dirC * { box-sizing: border-box; }
.dirC__bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.dirC__bg-img {
  position: absolute; inset: -40px;
  background-size: cover; background-position: center;
  filter: blur(80px) saturate(0.4) brightness(0.3);
  opacity: 0.25; transform: scale(1.1);
}
.dirC__bg-tint {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 80% 0%, oklch(78% 0.13 75 / 0.10) 0%, transparent 50%),
    linear-gradient(180deg, oklch(15% 0.005 260 / 0.92) 0%, var(--bg) 70%);
}
.dirC__bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(oklch(28% 0.010 260 / 0.4) 1px, transparent 1px),
    linear-gradient(90deg, oklch(28% 0.010 260 / 0.4) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  opacity: 0.4;
}
.dirC__hd {
  position: relative; z-index: 1;
  padding: 28px 48px 0;
}
.dirC__hd-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 28px;
}
.dirC__brand { display: flex; align-items: center; gap: 18px; }
.dirC__logo {
  display: flex; align-items: center; gap: 8px;
  background: var(--ink); color: var(--bg);
  padding: 8px 14px;
  font-weight: 800; letter-spacing: -0.02em;
  font-size: 18px;
}
.dirC__logo-mark { color: var(--acc); font-size: 14px; }
.dirC__brand-meta { padding-left: 18px; border-left: 1px solid var(--line); }
.dirC__brand-title {
  font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
  color: var(--ink);
}
.dirC__brand-sub {
  font-family: var(--mono); font-size: 11px; color: var(--ink-3);
  margin-top: 2px;
}

.dirC__nav {
  display: flex; gap: 2px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  padding: 3px; border-radius: 4px;
}
.dirC__nav-btn {
  background: transparent; border: none;
  padding: 8px 16px;
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.12em; font-weight: 500;
  color: var(--ink-2); cursor: pointer;
  border-radius: 3px;
  transition: all .15s;
}
.dirC__nav-btn:hover { color: var(--ink); background: var(--bg-3); }
.dirC__nav-btn.is-active {
  background: var(--ink); color: var(--bg); font-weight: 700;
}
.dirC__controls {
  display: flex; gap: 12px; align-items: center;
  margin-bottom: 16px;
}
.dirC__search {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  padding: 10px 14px;
  border-radius: 4px;
  color: var(--ink-3);
  transition: border-color .15s;
}
.dirC__search:focus-within { border-color: var(--acc); color: var(--ink-2); }
.dirC__search input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--ink); font-family: var(--sans); font-size: 14px;
  font-weight: 500;
}
.dirC__search input::placeholder { color: var(--ink-3); }
.dirC__search kbd {
  font-family: var(--mono); font-size: 10px;
  padding: 3px 7px; border: 1px solid var(--line); border-radius: 3px;
  color: var(--ink-3); background: var(--bg);
}

.dirC__sort-group {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-2); border: 1px solid var(--line);
  padding: 4px; border-radius: 4px;
}
.dirC__sort-lbl {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em;
  color: var(--ink-3); padding-left: 8px;
}
.dirC__sort-group select {
  background: transparent; border: none; outline: none;
  color: var(--ink); font-family: var(--sans); font-size: 13px;
  font-weight: 600; padding: 4px 8px; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='%2378806e' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 12px;
  padding-right: 22px;
}
.dirC__sort-group select option { background: var(--bg-2); }
.dirC__sort-dir {
  width: 28px; height: 28px;
  background: var(--bg-3); border: 1px solid var(--line); color: var(--acc);
  cursor: pointer; font-weight: 700; border-radius: 3px;
}

.dirC__mode-toggle {
  position: relative;
  display: flex;
  background: var(--bg-2); border: 1px solid var(--line);
  padding: 3px; border-radius: 4px;
}
.dirC__mode-toggle button {
  background: transparent; border: none;
  padding: 8px 16px;
  font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.1em; font-weight: 600;
  color: var(--ink-3); cursor: pointer;
  border-radius: 3px; position: relative; z-index: 2;
  transition: color .2s;
}
.dirC__mode-toggle button.is-active { color: var(--bg); }
.dirC__mode-thumb {
  position: absolute; top: 3px; bottom: 3px; width: calc(50% - 3px);
  background: var(--acc); border-radius: 3px;
  transition: transform .25s cubic-bezier(.5,.0,.2,1);
  z-index: 1;
}
.dirC__mode-thumb[data-mode="platformer"] { transform: translateX(100%); }
.dirC__filters {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 0; border-top: 1px solid var(--line); margin-top: 4px;
}
.dirC__chips {
  display: flex; gap: 6px; flex-wrap: wrap; flex: 1;
}
.dirC__fgroup-lbl {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em;
  color: var(--ink-3); margin-right: 4px;
  padding-top: 7px;
}
.dirC__chip {
  background: var(--bg-2); border: 1px solid var(--line);
  padding: 5px 11px;
  font-family: var(--sans); font-size: 11px; font-weight: 600;
  color: var(--ink-2); cursor: pointer; border-radius: 3px;
  transition: all .12s;
}
.dirC__chip:hover { border-color: var(--ink-3); color: var(--ink); }
.dirC__chip.is-on { background: var(--acc); border-color: var(--acc); color: var(--bg); }
.dirC__resultmeta {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 14px;
  padding: 18px 48px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  margin: 0 0 18px;
}
.dirC__count {
  font-family: var(--mono); font-size: 12px; color: var(--ink-3);
}
.dirC__count strong { color: var(--ink); font-weight: 700; }
.dirC__filter-summary { display: flex; gap: 6px; flex-wrap: wrap; }
.dirC__active-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--bg-2); border: 1px solid var(--line);
  padding: 3px 4px 3px 10px; border-radius: 3px;
  font-family: var(--mono); font-size: 10px;
  color: var(--ink); font-weight: 600;
}
.dirC__active-tag::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: var(--acc);
}
.dirC__active-tag {
  color: var(--ink);
}
.dirC__active-tag button {
  background: transparent; border: none;
  color: var(--ink-3); cursor: pointer;
  width: 18px; height: 18px; border-radius: 2px;
}
.dirC__active-tag button:hover { background: var(--bg-3); color: var(--ink); }
.dirC__list {
  position: relative; z-index: 1;
  padding: 0 48px;
  display: flex; flex-direction: column; gap: 10px;
}
.dirC__card {
  position: relative;
  display: grid;
  grid-template-columns: 40% 60%;
  height: 200px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  overflow: hidden;
  border-radius: 6px;
  transition: border-color .2s, transform .2s;
}
.dirC__card:hover { border-color: var(--line-2); }
.dirC__card.is-podium { border-color: var(--line-2); }
.dirC__card[data-podium="1"] {
  border-color: var(--acc);
  box-shadow: 0 0 0 1px var(--acc-soft), 0 8px 32px oklch(78% 0.13 75 / 0.12);
}
.dirC__thumb {
  position: relative;
  background: var(--bg-3);
  overflow: hidden;
}
.dirC__thumb img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(1.1);
  transition: transform .5s;
}
.dirC__card:hover .dirC__thumb img { transform: scale(1.04); }
.dirC__thumb-fade {
  position: absolute; inset: 0;
  background: linear-gradient(270deg, transparent 60%, var(--bg-2) 100%);
}
.dirC__thumb-corner {
  position: absolute; bottom: 12px; right: 14px;
  display: flex; flex-direction: column; gap: 2px;
  font-family: var(--mono);
  background: oklch(8% 0.005 260 / 0.92);
  backdrop-filter: blur(10px);
  padding: 7px 11px;
  border-radius: 4px;
  border: 1px solid oklch(100% 0 0 / 0.12);
  box-shadow: 0 4px 14px oklch(0% 0 0 / 0.4);
  align-items: flex-end;
}
.dirC__thumb-corner span {
  font-size: 8px; letter-spacing: 0.2em;
  color: oklch(75% 0.005 260);
  text-transform: uppercase;
  font-weight: 600;
}
.dirC__thumb-corner strong {
  font-size: 12px; color: oklch(98% 0.005 260); font-weight: 700;
  font-feature-settings: "tnum";
  letter-spacing: 0.02em;
}
.dirC__content {
  position: relative;
  padding: 0;
  display: grid;
  grid-template-columns: 70px 1fr;
  align-items: stretch;
}
.dirC__rank {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  border-right: 1px solid var(--line);
  order: -1;
}
.dirC__rank-num {
  font-family: var(--sans);
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--ink);
  line-height: 1;
  font-feature-settings: "tnum", "lnum";
}
.dirC__card[data-podium="1"] .dirC__rank-num { color: var(--acc); }
.dirC__card[data-podium="2"] .dirC__rank-num,
.dirC__card[data-podium="3"] .dirC__rank-num { color: var(--ink); }
.dirC__rank-pin {
  position: absolute;
  top: 12px; left: 50%;
  transform: translateX(-50%);
  font-family: var(--mono); font-size: 8px;
  letter-spacing: 0.22em;
  color: var(--acc); font-weight: 700;
  white-space: nowrap;
}

.dirC__detail {
  padding: 16px 18px;
  display: flex; flex-direction: column; justify-content: space-between;
  min-width: 0;
}
.dirC__detail-top { min-width: 0; }
.dirC__name {
  font-size: 17px; font-weight: 700;
  letter-spacing: -0.015em; line-height: 1.15;
  margin: 0 0 6px; color: var(--ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-wrap: balance;
}
.dirC__player {
  display: flex; align-items: baseline; gap: 5px;
  font-size: 12px;
}
.dirC__player-by {
  font-family: var(--mono); color: var(--ink-3);
  font-size: 10px; letter-spacing: 0.1em;
}
.dirC__player-name {
  color: var(--acc); font-weight: 600;
  font-size: 13px;
}

.dirC__detail-bottom { display: flex; flex-direction: column; gap: 8px; }
.dirC__stats {
  display: flex; gap: 14px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
}
.dirC__stats > div { display: flex; flex-direction: column; gap: 1px; }
.dirC__stats .lbl {
  font-family: var(--mono); font-size: 8px;
  letter-spacing: 0.18em; color: var(--ink-3);
}
.dirC__stats .val {
  font-family: var(--mono); font-size: 12px;
  color: var(--ink); font-weight: 600;
  font-feature-settings: "tnum";
}
.dirC__stats .val i {
  font-style: normal; color: var(--ink-3); font-size: 10px;
}

.dirC__cardtags { display: flex; flex-wrap: wrap; gap: 4px; }
.dirC__cardtag {
  font-family: var(--mono); font-size: 9px;
  letter-spacing: 0.06em; font-weight: 600;
  padding: 2px 7px; border-radius: 2px;
  text-transform: uppercase;
  position: relative; padding-left: 14px;
  color: var(--acc); background: oklch(78% 0.13 75 / 0.12);
}
.dirC__cardtag::before {
  content: ""; position: absolute; left: 5px; top: 50%; transform: translateY(-50%);
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
}

.dirC__open {
  position: absolute; top: 12px; left: 12px;
  width: 30px; height: 30px;
  background: var(--bg-3); border: 1px solid var(--line);
  color: var(--ink-2); cursor: pointer;
  font-size: 14px; font-weight: 700;
  border-radius: 3px;
  transition: all .15s;
}
.dirC__open:hover { background: var(--acc); color: var(--bg); border-color: var(--acc); }
`;

  window.DirectionC = DirectionC;
})();
