// app/components/scheduler.tsx
import React, { useState } from "react";
import { generateSchedule } from "../utils/simulatedAnnealingScheduler";
import type { Schedule, Category } from "../utils/simulatedAnnealingScheduler";
import { ScheduleGrid } from "./ScheduleGrid";


const CATEGORIES: Category[] = [
    {
        id: "school",
        name: "school-work",
        priority: 0.7,
        children: [
            {
                id: "bio101",
                name: "Biology-101",
                relativePriority: 0.6,
                maxStretch: 1.5,
                meetingTimes: [
                    { day: "monday", start: 800, end: 900 },
                    { day: "wednesday", start: 800, end: 900 },
                    { day: "friday", start: 800, end: 900 },
                ],
                preferredTimeBlocks: ["morning", "afternoon"],
                dependencyIds: [],
            },
            {
                id: "eng204",
                name: "English-204",
                relativePriority: 0.3,
                maxStretch: 2.0,
                meetingTimes: [
                    { day: "tuesday", start: 1330, end: 1530 },
                    { day: "thursday", start: 1330, end: 1530 },
                ],
                preferredTimeBlocks: ["morning", "afternoon"],
                dependencyIds: [],
            },
        ],
    },

    {
        id: "rest",
        name: "Sleep",
        priority: 0.2,
        children: [
            {
                id: "night-sleep",
                name: "NightSleep",
                relativePriority: 1.0,
                maxStretch: 8.0,
                preferredTimeBlocks: ["night"],
                dependencyIds: [],
            },
        ],
    },

    {
        id: "social",
        name: "Socializing",
        priority: 0.1,
        children: [
            {
                id: "friends",
                name: "FriendHang",
                relativePriority: 0.7,
                maxStretch: 3.0,
                preferredTimeBlocks: ["evening"],
                dependencyIds: [],
            },
            {
                id: "family",
                name: "FamilyTime",
                relativePriority: 0.3,
                maxStretch: 2.5,
                preferredTimeBlocks: ["evening"],
                dependencyIds: [],
            },
        ],
    },
];

export default function Scheduler() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [ms, setMs] = useState<number | null>(null);

    const handleGenerateSchedule = () => {
        try {
            const t0 = performance.now();
            const result = generateSchedule(CATEGORIES);
            const t1 = performance.now();
            setSchedule(result);
            setMs(t1 - t0);
            console.log(`Generated Weekly Schedule in ${Math.round(t1 - t0)} ms`, result);
        } catch (err) {
            console.error("❌ Error generating schedule:", err);
        }
    };

    return (
        <div style={{ padding: 16 }}>
            <button type="button" onClick={handleGenerateSchedule} style={{ padding: "8px 12px", marginBottom: 12 }}>
                Show Schedule
            </button>
            {ms !== null && <div style={{ marginBottom: 8 }}>Generated in {Math.round(ms)} ms</div>}
            {schedule && <ScheduleGrid schedule={schedule} />}
        </div>
    );
}
