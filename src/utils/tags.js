export const CLASSIC_TAGS = [
  "Level",
  "Challenge",
  "Low Hertz",
  "Progress",
  "Consistency",
  "Verified",
  "Rated",
  "Formerly Rated",
  "Tentative",
  "Noclip",
  "Speedhack",
  "Mobile",
  "2P",
  "Coin Route",
  "Miscellaneous",
  "Outdated Version",
  "Pending Removal",
];

export const PLATFORMER_TAGS = [
  "Platformer",
  "Deathless",
  "Rated",
  "Verified",
  "Consistency",
  "Progress",
  "Speedrun",
  "Low Hertz",
  "Mobile",
  "Coin Route",
  "Miscellaneous",
  "Outdated Version",
  "Pending Removal",
];

export const TAG_ICONS = {
  Level: "fa-square",
  Challenge: "fa-bullseye",
  "2P": "fa-handshake",
  "Low Hertz": "fa-wave-square",
  Progress: "fa-chart-line",
  Consistency: "fa-repeat",
  Verified: "fa-circle-check",
  Rated: "fa-star",
  "Formerly Rated": "fa-star-half-stroke",
  Tentative: "fa-hourglass-half",
  "Outdated Version": "fa-clock-rotate-left",
  "Pending Removal": "fa-trash-can",
  "Coin Route": "fa-coins",
  Noclip: "fa-ghost",
  Speedhack: "fa-gauge-high",
  Mobile: "fa-mobile-screen",
  Miscellaneous: "fa-puzzle-piece",
  Platformer: "fa-person-running",
  Deathless: "fa-heart-pulse",
  Speedrun: "fa-stopwatch",
};

export const TAG_DEFINITIONS = {
  Platformer: {
    className: "tag-platformer",
    text: "Platformer",
    tooltip: "Uses platformer mode, a side-scrolling mode added in update 2.2.",
  },
  Level: {
    className: "tag-level",
    text: "Level",
    tooltip: "A traditional level, which spans 30+ seconds.",
  },
  Challenge: {
    className: "tag-challenge",
    text: "Challenge",
    tooltip: "Tiny or short length level; a level that spans under 30 seconds.",
  },
  "Low Hertz": {
    className: "tag-low-hertz",
    text: "Low Hertz",
    tooltip:
      "Done at a low hz. Added when it significantly increases difficulty.",
  },
  Mobile: {
    className: "tag-mobile",
    text: "Mobile",
    tooltip: "Played on mobile.",
  },
  Speedhack: {
    className: "tag-speedhack",
    text: "Speedhack",
    tooltip: "Altered speed of the game.",
  },
  Noclip: {
    className: "tag-noclip",
    text: "Noclip",
    tooltip: "Done with noclip on.",
  },
  Deathless: {
    className: "tag-deathless",
    text: "Deathless",
    tooltip: "Platformer done without dying.",
  },
  Miscellaneous: {
    className: "tag-miscellaneous",
    text: "Miscellaneous",
    tooltip: "An achievement that doesn't fit with any other tags.",
  },
  Progress: {
    className: "tag-progress",
    text: "Progress",
    tooltip: "Parts of the level completed.",
  },
  Consistency: {
    className: "tag-consistency",
    text: "Consistency",
    tooltip: "Progress done in a row.",
  },
  Speedrun: {
    className: "tag-speedrun",
    text: "Speedrun",
    tooltip: "Time of completion contributes to the difficulty.",
  },
  "2P": {
    className: "tag-2p",
    text: "2 Player",
    tooltip: "Level uses 2 player mode.",
  },
  Rated: {
    className: "tag-rated",
    text: "Rated",
    tooltip: "Level is rated in-game.",
  },
  "Formerly Rated": {
    className: "tag-formerly-rated",
    text: "Formerly Rated",
    tooltip: "Level was rated but had its rating status removed.",
  },
  "Outdated Version": {
    className: "tag-outdated-version",
    text: "Outdated Version",
    tooltip:
      "Achievement is on an older version of its level than the current one, or done on a version before the latest release.",
  },
  "Pending Removal": {
    className: "tag-pending-removal",
    text: "Pending Removal",
    tooltip: "Levels set to be removed due to redundancy.",
  },
  Verified: {
    className: "tag-verified",
    text: "Verified",
    tooltip: "Levels that are verified without alterations such as speedhack.",
  },
  "Coin Route": {
    className: "tag-coin-route",
    text: "Coin Route",
    tooltip: "Coin(s) collected that contribute to the difficulty.",
  },
  Tentative: {
    className: "tag-tentative",
    text: "Tentative",
    tooltip: "Tentative placement; unfixed; subject to change.",
  },
};
