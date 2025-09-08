import { useState } from "react";

export default function Scheduler() {

    const [obligations, setObligations] = useState([
        {
            id: 'school',
            name: 'school-work',
            priority: 0.6,
            children: [
                {
                    id: "bio101",
                    name: "Biology-101",
                    relativePriority: 0.7,
                    maxStretch: 1.5,
                    meetingDays: ['monday','wednesday','friday'],
                    meetingTimes: {
                        start: 800,
                        finish: 900
                    },
                    preferredTimeBlocks: ['morning','afternoon'],
                    dependencyIds: []


                },

                {
                    id: "eng204",
                    name: "English-204",
                    relativePriority: 0.3,
                    maxStretch: 2.0,
                    meetingDays: ['tuesday', 'thursday'],
                    meetingTimes: {
                        start:1330,
                        finish:1530
                    },
                    preferredTimeBlocks: ['morning','afternoon'],
                    dependencyIds: []




                }
            ]


    },
        {

            id: "rest",
            name: "Sleep",
            priority: 0.35,
            children: [
                {
                    id: "night-sleep",
                    name: "NightSleep",
                    relativePriority: 1.0,
                    maxStretch: 8.0,
                    preferredTimeBlocks: ['evening'],
                    dependencyIds: []



                }
            ]

        },

        {
            id: "social",
            name: "Socializing",
            priority: 0.05,
            children: [

                {
                    id: "friends",
                    name: "FriendHang",
                    realtivePriority: 0.7,
                    maxStretch: 3.0,
                    preferredTimeBlocks: ['evening'],
                    dependencyIds: []

                },
                {
                    id: "family",
                    name: "FamilyTime",
                    relativePriority: 0.3,
                    maxStretch: 2.5,
                    preferredTimeBlocks: ['evening'],
                    dependencyIds: []
                }
            ]


        }


    ]);


    return (

        <div>

            <h1>Generate a Schedule</h1>
            <button onClick = {() => console.log(obligations)}>
                Show Categories
            </button>



        </div>

    );

};
