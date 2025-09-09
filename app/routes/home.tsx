

import React, { useRef } from "react";
import Scheduler from "../components/scheduler";
import Navbar from "../components/Navbar";
import "../css/Home.css";

export default function Home() {
    const schedulerRef = useRef<{ generate: () => void }>(null);

    return (
        <div className="home">
            <Navbar />


            <div className="dropdown">
                <div className="dropdown__trigger">☰ Menu</div>
                <div className="dropdown__content">
                    <button onClick={() => schedulerRef.current?.generate()}>
                        Show Schedule
                    </button>
                </div>
            </div>


            <header className="hero">
                <h1>Welcome to Class Synch</h1>
                <p>Effortless learning. Perfect sync.</p>
            </header>

            {/* Scheduler */}
            <main>
                <Scheduler ref={schedulerRef} />
            </main>
        </div>
    );
}
