import { useEffect, useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ROTATING = [
  "Any new ideas to explore, Friend?",
  "The mic is yours, Friend.",
  "What should we focus on, Friend?",
  "What's on your mind today, Friend?",
  "Where should we start, Friend?",
  "What's the plan, Friend?",
  "Ready when you are, Friend.",
  "Let's get to work, Friend.",
  "Welcome back, Friend.",
  "Great to see you again, Friend.",
  "Back for another session, Friend.",
  "Let's build something amazing, Friend.",
  "What are we learning today, Friend?",
  "Time to make progress, Friend.",
  "Your workspace is ready, Friend.",
  "Back at it, Friend.",
];

function timeGreeting(h: number): string {
  if (h >= 5 && h < 12) return "Good morning, Friend";
  if (h >= 12 && h < 17) return "Good afternoon, Friend";
  if (h >= 17) return "Good evening, Friend";
  return "Good night, Friend";
}

function pickGreeting(now: Date): string {
  const bucket = Math.floor(now.getTime() / (1000 * 60 * 5)); // 5-min slot
  const roll = (bucket * 9301 + 49297) % 233280;
  const kind = roll % 3;
  if (kind === 0) return timeGreeting(now.getHours());
  if (kind === 1) return `${DAYS[now.getDay()]} session, Friend`;
  return ROTATING[roll % ROTATING.length];
}

export function useGreeting(): string {
  const [greeting, setGreeting] = useState(() => pickGreeting(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => {
      setGreeting(pickGreeting(new Date()));
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return greeting;
}