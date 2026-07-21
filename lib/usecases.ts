export type UseCase = {
  key: string;
  icon: string;
  title: string;
  blurb: string;
  goal: string;
  sampleQuery: string;
  room: string; // which Gym scenario to rehearse the conversation in
};

export const useCases: UseCase[] = [
  {
    key: "freelance",
    icon: "◇",
    title: "Land a client",
    blurb: "Find teams that need your skill, then win the work.",
    goal: "Land freelance or consulting clients for my skills",
    sampleQuery: "startups hiring freelance React developers this month",
    room: "offer"
  },
  {
    key: "job",
    icon: "◈",
    title: "Land a role",
    blurb: "Find the opening, the manager, and the words to reach them.",
    goal: "Find and land a job that fits me",
    sampleQuery: "companies hiring junior product managers remote 2026",
    room: "offer"
  },
  {
    key: "founder",
    icon: "✦",
    title: "Raise or partner",
    blurb: "Find investors or partners and open the conversation.",
    goal: "Find investors or partners for my startup",
    sampleQuery: "seed investors backing AI education startups",
    room: "offer"
  },
  {
    key: "network",
    icon: "◉",
    title: "Grow your network",
    blurb: "Find people worth meeting and write the first message.",
    goal: "Build my professional network in my field",
    sampleQuery: "people to reach out to in AI product design",
    room: "team"
  }
];
