import type { KeywordTerm, PageData } from "./types";

const STOP = new Set(
  (
    "и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее её мне было вот от меня еще ещё нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это наш ваш ваши наши вашего вашей нашей наших вашу также которые который которая которых очень весь всё свой своих мы вы ваш как так этот эта эти то это чтобы или либо ещё уже просто каждый любой свою своего своей наш" +
    " the and for with that this from you your are our was were have has not but all can will about into more also its it's his her they them their what when which who how why use using get"
  ).split(" "),
);

const WEIGHT = { title: 5, h1: 4, description: 3, h2: 2, h3: 1.5, body: 1 } as const;

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\d-]+/u)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter(Boolean);
}

const usable = (t: string) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t);

export function extractKeywords(pages: PageData[]): { words: KeywordTerm[]; phrases: KeywordTerm[] } {
  const words = new Map<string, number>();
  const phrases = new Map<string, number>();

  const add = (text: string | null | undefined, w: number) => {
    if (!text) return;
    for (const sentence of text.split(/[.!?;:()«»"|•·—–\n]+/)) {
      const t = tokens(sentence);
      t.forEach((x) => usable(x) && words.set(x, (words.get(x) || 0) + w));
      for (const n of [2, 3]) {
        for (let i = 0; i + n <= t.length; i++) {
          const gram = t.slice(i, i + n);
          if (!usable(gram[0]) || !usable(gram[n - 1]) || gram.some((g) => /^\d+$/.test(g))) continue;
          const key = gram.join(" ");
          phrases.set(key, (phrases.get(key) || 0) + w);
        }
      }
    }
  };

  for (const p of pages.filter((x) => x.status === 200)) {
    add(p.title, WEIGHT.title);
    p.h1.forEach((h) => add(h, WEIGHT.h1));
    add(p.description, WEIGHT.description);
    p.headings.filter((h) => h.level === 2).forEach((h) => add(h.text, WEIGHT.h2));
    p.headings.filter((h) => h.level === 3).forEach((h) => add(h.text, WEIGHT.h3));
    add(p.text.slice(0, 20000), WEIGHT.body);
  }

  const topWords = [...words].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([term, score]) => ({ term, score: Math.round(score) }));
  const sortedPhrases = [...phrases].filter(([, s]) => s >= 3).sort((a, b) => b[1] - a[1]);
  const max = sortedPhrases[0]?.[1] || 1;
  const topPhrases = sortedPhrases.slice(0, 10).map(([term, score]) => ({ term, score: Math.round((score / max) * 100) }));
  return { words: topWords, phrases: topPhrases };
}
