export const clan = {
  name: "DEICIDEE",
  game: "CrossFire",
  timezone: "Asia/Manila",
} as const;

export const tryoutModes = [
  { id: "tdm", name: "Team Deathmatch", shortName: "TDM" },
  { id: "zm_hmx", name: "ZM HMX", shortName: "ZM HMX" },
  { id: "escape", name: "Escape", shortName: "Escape" },
] as const;

export type TryoutMode = (typeof tryoutModes)[number]["id"];
