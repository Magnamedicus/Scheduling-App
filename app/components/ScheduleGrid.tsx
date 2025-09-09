// app/components/ScheduleGrid.tsx
import React, { useMemo } from "react";
import { DAYS, BLOCKS_PER_DAY } from "../utils/scheduleHelpers";
import type { Schedule } from "../utils/simulatedAnnealingScheduler";
// Adjust this import path to match where you saved the CSS
import "../css/ScheduleGrid.css";

const BLOCKS_PER_HOUR = Math.floor(BLOCKS_PER_DAY / 24);
const ROW_PX = 20; // must match .schedule__day { grid-template-rows: repeat(96, 20px); }

function idxToTimeLabel(idx: number): string {
    const h = Math.floor(idx / BLOCKS_PER_HOUR);
    const m = (idx % BLOCKS_PER_HOUR) * 15;
    const hh = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? "AM" : "PM";
    const mm = m.toString().padStart(2, "0");
    return `${hh}:${mm} ${ampm}`;
}

type DayBlock = {
    label: string;
    startIdx: number; // 0..95
    length: number;   // number of 15-min slots
};

/**
 * Group contiguous slots with the same non-null label into blocks.
 */
function buildBlocksForDay(daySlots: (string | null)[]): DayBlock[] {
    const blocks: DayBlock[] = [];
    let i = 0;

    while (i < BLOCKS_PER_DAY) {
        const label = daySlots[i];
        if (!label) {
            i++;
            continue;
        }
        let j = i + 1;
        while (j < BLOCKS_PER_DAY && daySlots[j] === label) j++;
        blocks.push({ label, startIdx: i, length: j - i });
        i = j;
    }
    return blocks;
}

/**
 * Map a task label to a block type modifier for color-coding.
 * Tweak this as needed to match your task naming.
 */
function taskToType(label: string): "study" | "class" | "sleep" | "family" | "friends" | "study" {
    const l = label.toLowerCase();

    // common signals
    if (l.includes("sleep") || l === "sleep" || l === "nightsleep") return "sleep";
    if (l.includes("class") || l.includes("lecture") || l.includes("lab") || l.match(/\b(eng|bio|math|chem|cs)\b/)) return "class";
    if (l.includes("family")) return "family";
    if (l.includes("friend")) return "friends";
    if (l.includes("study") || l.includes("studying") || l.includes("read") || l.includes("homework")) return "study";

    // defaults for common names in your mock data
    if (l === "biolog y-101".replace(" ", "") || l === "biology-101" || l === "english-204") return "class";
    if (l === "friendhang") return "friends";
    if (l === "familytime") return "family";

    return "study";
}

export function ScheduleGrid({ schedule }: { schedule: Schedule }) {
    // Precompute blocks per day
    const dayBlocks = useMemo(() => {
        const result: Record<string, DayBlock[]> = {};
        for (const day of DAYS) {
            result[day] = buildBlocksForDay(schedule[day] || Array(BLOCKS_PER_DAY).fill(null));
        }
        return result;
    }, [schedule]);

    return (
        <div className="schedule">
            {/* Legend */}
            <div className="schedule__legend">
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--study" /> Study
        </span>
                <span className="legend__item">
          <span className="legend__swatch legend__swatch--class" /> Class Meeting
        </span>
                <span className="legend__item">
          <span className="legend__swatch legend__swatch--sleep" /> Sleep
        </span>
                <span className="legend__item">
          <span className="legend__swatch legend__swatch--family" /> Family Time
        </span>
                <span className="legend__item">
          <span className="legend__swatch legend__swatch--friends" /> Friend Hang
        </span>
            </div>

            {/* Header */}
            <div className="schedule__header">
                <div className="schedule__corner" />
                {DAYS.map((day) => (
                    <div key={day} className="schedule__day-header">
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                    </div>
                ))}
            </div>

            {/* Body: time column + 7 day columns */}
            <div className="schedule__body">
                {/* Time Column */}
                <div className="schedule__time">
                    {Array.from({ length: BLOCKS_PER_DAY }).map((_, idx) => (
                        <div
                            key={`time-${idx}`}
                            className="schedule__time-slot"
                            data-label={idx % BLOCKS_PER_HOUR === 0 ? idxToTimeLabel(idx) : ""}
                        />
                    ))}
                </div>

                {/* Day Columns */}
                {DAYS.map((day) => (
                    <div key={day} className="schedule__day">
                        {/* Optional hoverable cells if you want an interactive grid (not required) */}
                        {Array.from({ length: BLOCKS_PER_DAY }).map((_, idx) => (
                            <div key={`${day}-cell-${idx}`} className="schedule__cell" />
                        ))}

                        {/* Render blocks */}
                        {dayBlocks[day].map((b, i) => {
                            const blockType = taskToType(b.label);
                            const topPx = b.startIdx * ROW_PX;
                            const heightPx = b.length * ROW_PX;

                            // Build a short time label for the block meta
                            const startLabel = idxToTimeLabel(b.startIdx).replace(" ", "");
                            const endLabel = idxToTimeLabel(b.startIdx + b.length).replace(" ", "");

                            return (
                                <div
                                    key={`${day}-block-${i}-${b.label}-${b.startIdx}`}
                                    className={`block block--${blockType}`}
                                    style={
                                        {
                                            // Using CSS variables consumed by the stylesheet
                                            ["--top" as any]: `${topPx}px`,
                                            ["--height" as any]: `${heightPx}px`,
                                        } as React.CSSProperties
                                    }
                                    title={`${b.label} • ${startLabel}–${endLabel}`}
                                >
                                    <div className="block__title">{b.label}</div>
                                    <div className="block__meta">
                                        {startLabel}–{endLabel}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
