// app/components/ScheduleGrid.tsx
import React from "react";
import { DAYS, BLOCKS_PER_DAY } from "../utils/scheduleHelpers";
import type { Schedule } from "../utils/simulatedAnnealingScheduler";

const BLOCKS_PER_HOUR = Math.floor(BLOCKS_PER_DAY / 24);

function idxToTimeLabel(idx: number): string {
    const h = Math.floor(idx / BLOCKS_PER_HOUR);
    const m = (idx % BLOCKS_PER_HOUR) * 15;
    const hh = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? "AM" : "PM";
    const mm = m.toString().padStart(2, "0");
    return `${hh}:${mm} ${ampm}`;
}


export function ScheduleGrid({ schedule }: { schedule: Schedule }) {
    const styles: Record<string, React.CSSProperties> = {
        wrapper: { fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "16px auto" },
        table: { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" },
        th: { position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1, border: "1px solid #ddd", padding: 6 },
        td: { border: "1px solid #eee", padding: 0, height: 20, fontSize: 10, lineHeight: "20px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
        timeCol: { width: 70, background: "#fafafa", position: "sticky", left: 0, zIndex: 2, borderRight: "1px solid #ddd" },
        dayHeaderLeftPad: { paddingLeft: 8 },
    };

    const rows = Array.from({ length: BLOCKS_PER_DAY }, (_, i) => i);

    return (
        <div style={styles.wrapper}>
            <table style={styles.table}>
                <thead>
                <tr>
                    <th style={{ ...styles.th, ...styles.timeCol }}>Time</th>
                    {DAYS.map((day) => (
                        <th key={day} style={styles.th}>
                            <div style={styles.dayHeaderLeftPad}>{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((idx) => (
                    <tr key={idx}>
                        <td style={{ ...styles.td, ...styles.timeCol }}>
                            {idx % BLOCKS_PER_HOUR === 0 ? idxToTimeLabel(idx) : ""}
                        </td>
                        {DAYS.map((day) => (
                            <td key={`${day}-${idx}`} style={styles.td}>
                                {schedule[day]?.[idx] ?? null}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
