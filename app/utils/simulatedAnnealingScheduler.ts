

import { DAYS, BLOCKS_PER_DAY, timeToBlockIndex } from "./scheduleHelpers";

/** Derive locally to avoid extra exports */
const BLOCKS_PER_HOUR = Math.floor(BLOCKS_PER_DAY / 24);
const TOTAL_BLOCKS = BLOCKS_PER_DAY * DAYS.length;

export interface MeetingTime {
    day: string;
    start: number;
    end: number;
}

export interface Obligation {
    id: string;
    name: string;
    relativePriority: number;
    maxStretch: number;
    preferredTimeBlocks: string[];
    dependencyIds: string[];
    meetingTimes?: MeetingTime[];

    // computed during scheduling:
    blocksRequired?: number;
    __frac?: number;
}

export interface Category {
    id: string;
    name: string;
    priority: number;
    children: Obligation[];
}

export interface Schedule {
    [day: string]: (string | null)[];
}

/* -------------------- time-of-day helpers -------------------- */

const isNightIdx = (idx: number) => {
    const h = Math.floor(idx / BLOCKS_PER_HOUR);
    return h >= 22 || h < 6; // 22:00–24:00 and 00:00–06:00
};

function idxToBucketTag(idx: number): "morning" | "afternoon" | "evening" | "night" {
    const h = Math.floor(idx / BLOCKS_PER_HOUR);
    if (h >= 6 && h < 12)  return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 22) return "evening";
    return "night";
}

const BUCKET_PRED: Record<"morning"|"afternoon"|"evening"|"night", (i: number) => boolean> = {
    morning:   (i) => { const h = Math.floor(i / BLOCKS_PER_HOUR); return h >= 6  && h < 12; },
    afternoon: (i) => { const h = Math.floor(i / BLOCKS_PER_HOUR); return h >= 12 && h < 17; },
    evening:   (i) => { const h = Math.floor(i / BLOCKS_PER_HOUR); return h >= 17 && h < 22; },
    night:     (i) => isNightIdx(i),
};



function cloneSchedule(s: Schedule): Schedule {
    const out: Schedule = {} as Schedule;
    for (const d of DAYS) out[d] = s[d].slice();
    return out;
}
const prefersNight = (t: Obligation) => t.preferredTimeBlocks?.includes("night");
const looksLikeSleep = (o: Obligation) => /sleep/i.test(o.name) || prefersNight(o);

function canUse(task: Obligation, day: string, i: number, blocked: Set<string>, s: Schedule) {
    if (blocked.has(`${day}:${i}`)) return false;
    if (s[day][i] !== null) return false;

    const BPH = Math.floor(BLOCKS_PER_DAY / 24);
    const h = Math.floor(i / BPH);
    const night = h >= 22 || h < 6;
    const isSleep = looksLikeSleep(task);


    if (isSleep) return night;


    if (h >= 20 && h < 22) {
        return task.preferredTimeBlocks?.includes("evening") === true;
    }

    // Everything else: daytime (6:00–20:00)
    return !night && h >= 6 && h < 20;
}



function chunkSizeFor(task: Obligation): number {
    // convert hours to blocks, clamp to sensible chunk sizes
    const cap = Math.max(1, Math.round(task.maxStretch * BLOCKS_PER_HOUR));
    // most tasks: 1h chunks; classes/study may be 2–3h; sleep handled separately
    return Math.min(cap, 4);
}

function placeChunk(
    s: Schedule, task: Obligation, day: string, start: number, len: number, blocked: Set<string>
): boolean {
    for (let k = 0; k < len; k++) {
        const idx = start + k;
        if (idx >= BLOCKS_PER_DAY) return false;
        if (!canUse(task, day, idx, blocked, s)) return false;
    }
    for (let k = 0; k < len; k++) s[day][start + k] = task.name;
    return true;
}

function removeChunkIfMatches(
    s: Schedule, name: string, day: string, start: number, len: number, blocked: Set<string>
): number {
    let removed = 0;
    for (let k = 0; k < len; k++) {
        const idx = start + k;
        if (idx >= BLOCKS_PER_DAY) break;
        const key = `${day}:${idx}`;
        if (blocked.has(key)) break;
        if (s[day][idx] !== name) break;
        s[day][idx] = null;
        removed++;
    }
    return removed;
}

function scanRuns(s: Schedule, taskName: string, blocked: Set<string>) {
    const runs: Array<[string, number, number]> = [];
    for (const day of DAYS) {
        let start = -1, len = 0;
        for (let i = 0; i < BLOCKS_PER_DAY; i++) {
            const key = `${day}:${i}`;
            const isTask = s[day][i] === taskName && !blocked.has(key);
            if (isTask) {
                if (start === -1) start = i;
                len++;
            } else if (len > 0) {
                runs.push([day, start, len]);
                start = -1; len = 0;
            }
        }
        if (len > 0) runs.push([day, start, len]);
    }
    return runs;
}




function apportionTargets(categories: Category[]): Obligation[] {
    const obligations: Obligation[] = [];

    for (const cat of categories) {
        const catExact = TOTAL_BLOCKS * cat.priority;

        for (const child of cat.children) {
            const exact = catExact * child.relativePriority;
            const floored = Math.floor(exact);
            child.blocksRequired = floored;
            child.__frac = exact - floored;
            obligations.push(child);
        }


        const assigned = cat.children.reduce((s, c) => s + (c.blocksRequired ?? 0), 0);
        let leftover = Math.round(catExact - assigned);
        if (leftover > 0) {
            cat.children
                .slice()
                .sort((a, b) => (b.__frac ?? 0) - (a.__frac ?? 0))
                .forEach((c) => {
                    if (leftover > 0) {
                        c.blocksRequired = (c.blocksRequired ?? 0) + 1;
                        leftover--;
                    }
                });
        }
    }

    return obligations;
}


function seedMeetings(schedule: Schedule, obligations: Obligation[]) {
    const blocked = new Set<string>();
    for (const task of obligations) {
        if (!task.meetingTimes?.length) continue;
        for (const mt of task.meetingTimes) {
            const startIdx = timeToBlockIndex(mt.start);
            const endIdx = timeToBlockIndex(mt.end);
            const span = Math.max(0, endIdx - startIdx);
            for (let i = startIdx; i < endIdx; i++) {
                schedule[mt.day][i] = task.name;
                blocked.add(`${mt.day}:${i}`);
            }
            task.blocksRequired = Math.max(0, (task.blocksRequired ?? 0) - span);
        }
    }
    return blocked;
}








function seedSleepEvenlyPerNight(
    schedule: Schedule,
    blocked: Set<string>,
    obligations: Obligation[],
    targetHoursPerNight = 8
) {
    const sleepTasks = obligations.filter(looksLikeSleep);
    if (!sleepTasks.length) return;

    const BPH = Math.floor(BLOCKS_PER_DAY / 24); // 4
    const NIGHTLY = targetHoursPerNight * BPH;   // 8h -> 32 blocks

    const EVE_22 = 22 * BPH; // 22:00 index on day d
    const MOR_06 =  6 * BPH; // 06:00 index on day d+1
    const nextDay = (di: number) => DAYS[(di + 1) % DAYS.length];

    for (const task of sleepTasks) {
        // We always place one contiguous 8h block per night and then zero this out
        for (let di = 0; di < 7; di++) {
            const dayE = DAYS[di];
            const dayM = nextDay(di);

            let placed = 0;
            const setCell = (day: string, i: number) => {
                const key = `${day}:${i}`;
                if (!blocked.has(key) && schedule[day][i] === null) {
                    schedule[day][i] = task.name;
                    blocked.add(key); // freeze
                    placed++;
                    return true;
                }
                return false;
            };

            // 22:00–24:00 on dayE
            for (let i = EVE_22; i < BLOCKS_PER_DAY && placed < NIGHTLY; i++) setCell(dayE, i);
            // 00:00–06:00 on dayM
            for (let i = 0; i < MOR_06 && placed < NIGHTLY; i++) setCell(dayM, i);


            if (placed < NIGHTLY) {

                for (let i = EVE_22 - 1; i >= 21 * BPH && placed < NIGHTLY; i--) setCell(dayE, i);
            }
            if (placed < NIGHTLY) {

                for (let i = MOR_06; i < 7 * BPH && placed < NIGHTLY; i++) setCell(dayM, i);
            }
        }

        // Prevent any further sleep placement later
        task.blocksRequired = 0;
    }
}








function greedyFill(schedule: Schedule, blocked: Set<string>, obligations: Obligation[]) {
    // preferred buckets first
    for (const task of obligations) {
        let need = task.blocksRequired ?? 0;
        if (need <= 0) continue;

        const prefs = (task.preferredTimeBlocks?.length
            ? task.preferredTimeBlocks
            : ["morning", "afternoon", "evening", "night"]) as Array<keyof typeof BUCKET_PRED>;

        const chunk = chunkSizeFor(task);

        for (const pref of prefs) {
            if (need <= 0) break;
            const want = BUCKET_PRED[pref];

            outer: for (const day of DAYS) {
                for (let i = 0; i < BLOCKS_PER_DAY && need > 0; i++) {
                    if (!want(i)) continue;
                    if (placeChunk(schedule, task, day, i, Math.min(chunk, need), blocked)) {
                        need -= Math.min(chunk, need);
                    }
                }
                if (need <= 0) break outer;
            }
        }
        task.blocksRequired = need;
    }

    // daytime fallback only
    for (const task of obligations) {
        let need = task.blocksRequired ?? 0;
        if (need <= 0) continue;

        const chunk = chunkSizeFor(task);

        outer2: for (const day of DAYS) {
            for (let i = 0; i < BLOCKS_PER_DAY && need > 0; i++) {
                if (isNightIdx(i) && !prefersNight(task)) continue; // daytime only for non-night tasks
                if (placeChunk(schedule, task, day, i, Math.min(chunk, need), blocked)) {
                    need -= Math.min(chunk, need);
                }
            }
            if (need <= 0) break outer2;
        }
        task.blocksRequired = need;
    }
}

function buildTargetMap(obligations: Obligation[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const o of obligations) m.set(o.id, Math.max(0, o.blocksRequired ?? 0));
    return m;
}



function scoreSchedule(
    s: Schedule,
    obligations: Obligation[],
    targets: Map<string, number>,
    blocked: Set<string>
): number {
    let val = 0;

    for (const task of obligations) {
        const target = targets.get(task.id) ?? 0;
        let count = 0;
        let prefHits = 0;
        let transitions = 0;
        let totalRunBonus = 0;

        for (const day of DAYS) {
            let prev: string | null = null;
            let run = 0;

            for (let i = 0; i < BLOCKS_PER_DAY; i++) {
                const cell = s[day][i];

                if (cell === task.name) {
                    count++;
                    run++;
                    const tag = idxToBucketTag(i);
                    if (task.preferredTimeBlocks?.includes(tag)) prefHits++;
                }

                if (prev !== cell) {
                    if (prev === task.name || cell === task.name) transitions++;
                    if (prev === task.name && run > 0) {
                        const maxRun = Math.max(1, Math.round(task.maxStretch * BLOCKS_PER_HOUR));
                        totalRunBonus += Math.min(run, maxRun);
                        run = 0;
                    }
                    prev = cell;
                }
            }
            if (prev === task.name && run > 0) {
                const maxRun = Math.max(1, Math.round(task.maxStretch * BLOCKS_PER_HOUR));
                totalRunBonus += Math.min(run, maxRun);
            }
        }

        val -= Math.abs(count - target) * 3; // hit per-task targets
        val += prefHits * 0.5;               // align with preferred windows
        val -= transitions * 0.15;           // discourage fragmentation
        val += totalRunBonus * 0.08;         // reward longer runs
    }


    for (const day of DAYS) {
        for (let i = 0; i < BLOCKS_PER_DAY; i++) {
            const v = s[day][i];
            if (v !== null) {
                val += 0.05;
                if (!/sleep/i.test(v) && isNightIdx(i)) val -= 0.6;
            }
        }
    }

    return val;
}

function mutate(base: Schedule, obligations: Obligation[], blocked: Set<string>): Schedule {
    const s = cloneSchedule(base);
    const task = obligations[Math.floor(Math.random() * obligations.length)];
    const csize = chunkSizeFor(task);
    const isSleepTask = looksLikeSleep(task);

    const freeByDay: Record<string, number[]> = {};
    const takenRuns = scanRuns(s, task.name, blocked);

    for (const day of DAYS) {
        freeByDay[day] = [];
        for (let i = 0; i < BLOCKS_PER_DAY; i++) {
            if (canUse(task, day, i, blocked, s)) freeByDay[day].push(i);
        }
    }

    const action = Math.random();
    if (action < 0.4) {
        // ADD chunk (sleep can only add at night via canUse; nights are mostly frozen)
        const day = DAYS[Math.floor(Math.random() * DAYS.length)];
        const starts = freeByDay[day];
        if (starts.length) {
            for (let t = 0; t < 8; t++) {
                const i = starts[Math.floor(Math.random() * starts.length)];
                if (placeChunk(s, task, day, i, csize, blocked)) break;
            }
        }
    } else if (action < 0.8) {
        // REMOVE chunk (skip sleep)
        if (!isSleepTask && takenRuns.length) {
            const [day, start, len] = takenRuns[Math.floor(Math.random() * takenRuns.length)];
            const removeLen = Math.min(len, csize);
            removeChunkIfMatches(s, task.name, day, start, removeLen, blocked);
        }
    } else {

        if (!isSleepTask && takenRuns.length) {
            const [d1, start, len] = takenRuns[Math.floor(Math.random() * takenRuns.length)];
            const moveLen = Math.min(len, csize);
            const removed = removeChunkIfMatches(s, task.name, d1, start, moveLen, blocked);
            if (removed > 0) {
                const day = DAYS[Math.floor(Math.random() * DAYS.length)];
                const starts = freeByDay[day];
                if (starts.length) {
                    for (let t = 0; t < 8; t++) {
                        const i = starts[Math.floor(Math.random() * starts.length)];
                        if (placeChunk(s, task, day, i, removed, blocked)) break;
                    }
                }
            }
        }
    }

    return s;
}



function fillDaytimeGapsByDeficit(
    schedule: Schedule,
    blocked: Set<string>,
    obligations: Obligation[],
    targets: Map<string, number>
) {
    // counts
    const counts = new Map<string, number>();
    for (const o of obligations) counts.set(o.id, 0);
    for (const day of DAYS) {
        for (let i = 0; i < BLOCKS_PER_DAY; i++) {
            const v = schedule[day][i];
            if (!v) continue;
            const o = obligations.find(x => x.name === v);
            if (o) counts.set(o.id, (counts.get(o.id) ?? 0) + 1);
        }
    }

    // deficits (ignore sleep — already seeded & frozen)
    type Need = { task: Obligation; deficit: number };
    const needs: Need[] = [];
    for (const o of obligations) {
        if (looksLikeSleep(o)) continue;
        const tgt = targets.get(o.id) ?? 0;
        const cur = counts.get(o.id) ?? 0;
        const deficit = Math.max(0, tgt - cur);
        if (deficit > 0) needs.push({ task: o, deficit });
    }

    // Prefer larger deficits and tasks that prefer evening (social)
    needs.sort((a, b) =>
        b.deficit - a.deficit ||
        (b.task.preferredTimeBlocks?.includes("evening") ? 1 : 0) -
        (a.task.preferredTimeBlocks?.includes("evening") ? 1 : 0)
    );

    for (const day of DAYS) {
        for (let i = 0; i < BLOCKS_PER_DAY; i++) {
            if (isNightIdx(i)) continue; // daytime/evening only
            const key = `${day}:${i}`;
            if (schedule[day][i] !== null || blocked.has(key)) continue;

            // choose the first task that fits here and still has deficit
            for (const n of needs) {
                if (n.deficit <= 0) continue;
                if (!canUse(n.task, day, i, blocked, schedule)) continue;
                schedule[day][i] = n.task.name;
                n.deficit--;
                break;
            }
        }
    }
}




export function generateSchedule(categories: Category[]): Schedule {

    const schedule: Schedule = Object.fromEntries(
        DAYS.map((d) => [d, Array(BLOCKS_PER_DAY).fill(null)])
    ) as Schedule;


    const obligations = apportionTargets(categories);


    const blocked = seedMeetings(schedule, obligations);

    const targets = buildTargetMap(obligations);


    seedSleepEvenlyPerNight(schedule, blocked, obligations, 8);
    greedyFill(schedule, blocked, obligations);

    // chunk operators

    const INITIAL_TEMP = 100;
    const FINAL_TEMP   = 0.02;
    const COOLING      = 0.92;
    const ITERS        = 450;

    let current = schedule;
    let currentScore = scoreSchedule(current, obligations, targets, blocked);
    let best = current;
    let bestScore = currentScore;

    for (let T = INITIAL_TEMP; T > FINAL_TEMP; T *= COOLING) {
        for (let i = 0; i < ITERS; i++) {
            const cand = mutate(current, obligations, blocked);
            const candScore = scoreSchedule(cand, obligations, targets, blocked);
            const delta = candScore - currentScore;
            if (delta > 0 || Math.exp(delta / T) > Math.random()) {
                current = cand;
                currentScore = candScore;
                if (currentScore > bestScore) {
                    best = current;
                    bestScore = currentScore;
                }
            }
        }
    }


    fillDaytimeGapsByDeficit(best, blocked, obligations, targets);


    return best;
}
