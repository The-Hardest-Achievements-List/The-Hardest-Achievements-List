import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { loadListData } from "./data/listData";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const isHome = path === "/" || path === "/home";
const isLeaderboard =
  path === "/leaderboard" || path.startsWith("/leaderboard/");

// Start heavy work before App's module graph downloads.
if (!isHome) {
  void loadListData();
  if (isLeaderboard) {
    void import("./pages/LeaderboardPage.jsx");
  } else {
    void import("./components/LevelList.jsx");
  }
}

void import("./App.jsx").then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Icons are not needed for first paint — load after React mounts.
  void import("@fortawesome/fontawesome-free/css/all.min.css");
});
