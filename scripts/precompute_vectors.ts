import fs from "fs";
import path from "path";

const DIMENSION = 128;

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0;
}

function getVector(text: string): number[] {
  const vector = new Array(DIMENSION).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    const idx = hashString(token) % DIMENSION;
    vector[idx] += 1;
  }

  let norm = 0;
  for (let i = 0; i < DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < DIMENSION; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

const GLOBAL_SYNONYMS: Record<string, string[]> = {
  happy: ["smile", "grin", "joy", "laugh"],
  sad: ["frown", "cry", "sob", "unhappy"],
  love: ["heart", "kiss", "couple", "valentines"],
  cold: ["snowflake", "ice", "freeze", "winter", "shiver"],
  hot: ["fire", "sun", "burn", "sweat"],
  scared: ["fear", "ghost", "scream", "shock"],
  angry: ["rage", "mad", "pissed", "fume"],
  party: ["celebrate", "balloon", "confetti", "popper"],
  sleep: ["zzz", "bed", "tired", "yawn"],
  money: ["dollar", "cash", "rich", "bank"],
  dog: ["puppy", "hound", "bark"],
  cat: ["kitty", "meow", "feline"],
};

function main() {
  const assetsPath = path.join(__dirname, "../assets");
  const index = JSON.parse(
    fs.readFileSync(path.join(assetsPath, "index.json"), "utf-8"),
  );

  const vectors: Record<string, number[]> = {};

  const synonymsEntries = Object.entries(GLOBAL_SYNONYMS);

  for (const [unicode, info] of Object.entries(index as any)) {
    const anyInfo = info as any;
    const baseKeywords = anyInfo.k || [];
    const extraKeywords = new Set<string>();

    synonymsEntries.forEach(([key, values]) => {
      if (
        values.some((v) => baseKeywords.includes(v)) ||
        baseKeywords.includes(key)
      ) {
        extraKeywords.add(key);
        values.forEach((v) => extraKeywords.add(v));
      }
    });

    const combinedKeywords = Array.from(
      new Set([...baseKeywords, ...Array.from(extraKeywords)]),
    );
    const sourceText = `${anyInfo.a} ${combinedKeywords.join(" ")}`;
    vectors[unicode] = getVector(sourceText);
  }

  fs.writeFileSync(
    path.join(assetsPath, "vectors.json"),
    JSON.stringify(vectors),
  );
  console.log("Precomputed vectors for", Object.keys(vectors).length, "emojis");
}

main();
