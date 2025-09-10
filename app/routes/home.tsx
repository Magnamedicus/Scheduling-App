// app/routes/home.tsx
import React, { useState, useRef } from "react";
import Scheduler from "../components/scheduler";
import "../css/Home.css";

import Navbar from "~/components/Navbar";

export default function Home() {
    const schedulerRef = useRef<{ generate: () => void }>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [isSignup, setIsSignup] = useState(false);

    const handleScheduleClick = () => {
        schedulerRef.current?.generate();
    };

    const toggleForm = () => {
        setShowLogin(!showLogin);
    };

    return (
        <div className="home">
            <Navbar />
            {/* Dropdown Menu */}
            <div className="dropdown">
                <div
                    className="dropdown__trigger"
                    onClick={toggleForm}
                    role="button"
                    tabIndex={0}
                >
                    ≡ Menu
                </div>
                <div className={`dropdown__content ${showLogin ? "open" : ""}`}>
                    <button onClick={handleScheduleClick}>Generate Schedule</button>

                    {/* Auth Form */}
                    <div className="auth-form">
                        <h3>{isSignup ? "Create Profile" : "Login"}</h3>
                        <form>
                            <input type="text" placeholder="Username" required />
                            <input type="password" placeholder="Password" required />
                            {isSignup && (
                                <input type="email" placeholder="Email Address" required />
                            )}
                            <button type="submit">
                                {isSignup ? "Sign Up" : "Log In"}
                            </button>
                        </form>
                        <p onClick={() => setIsSignup(!isSignup)} className="toggle-form">
                            {isSignup
                                ? "Already have an account? Log in"
                                : "Need an account? Sign up"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <header className="hero">
                <h1>Welcome to Class Synch</h1>
                <p>Effortless learning. Perfect sync.</p>
            </header>

            {/* Scheduler */}
            <main className="main-content">
                <Scheduler ref={schedulerRef}  />
            </main>
        </div>
    );
}

