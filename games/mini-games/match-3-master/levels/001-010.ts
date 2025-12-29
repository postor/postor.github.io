
import { LevelConfig } from '../types';

export const levels001to010: LevelConfig[] = [
    {
        id: 1,
        name: "Basic Match-3",
        rows: 6,
        cols: 6,
        colors: ['🍎', '💎', '🍃'],
        moves: 5,
        targetScore: 300,
        iceCount: 0,
        // Vertical Match Setup:
        // (1,3)=0
        // (2,3)=0
        // (3,3)=1 (Target to swap out)
        // (4,3)=0 (Source to swap in)
        initialGrid: [
             ['1','2','1','2','1','2'],
             ['2','1','2','0','2','1'], // r1 c3=0
             ['1','2','1','0','1','2'], // r2 c3=0
             ['2','1','2','1','2','1'], // r3 c3=1 (Swap this)
             ['1','2','1','0','1','2'], // r4 c3=0 (Swap UP)
             ['2','1','2','1','2','1']
        ].map(row => row.map(c => c === '0' ? '0' : (c==='1'?'1':'2'))),
        tutorialSteps: [
            { text: "Swap the Apple 🍎 UP to make a match of 3!", highlight: [{r:3, c:3}, {r:4, c:3}] }
        ]
    },
    {
        id: 2,
        name: "Rocket Power",
        rows: 7,
        cols: 7,
        colors: ['🍎', '💎', '🍃', '⭐'],
        moves: 10,
        targetScore: 1000,
        iceCount: 0,
        // Match 4 Horizontal
        // Row 3: 1 2 0 0 1 0 2 (c2=0, c3=0, c4=1, c5=0)
        // Row 2: c4 needs to be 0
        initialGrid: [
            ['1','2','3','1','2','3','0'],
            ['3','0','1','2','0','0','1'], // r1 c4=0
            ['1','2','3','0','0','2','3'], // r2 c4=0 (Swap Source: Down into 1)
            ['1','2','0','0','1','0','2'], // r3 c2=0 c3=0 c4=1 c5=0
            ['2','3','1','2','3','0','1'],
            ['3','0','2','3','0','1','2'],
            ['1','2','3','0','1','2','3']
        ].map((row, r) => {
             // Ensure no accidental matches
             if(r===2) return ['1','2','3','0','0','2','3'];
             if(r===3) return ['1','2','0','0','1','0','2'];
             return row;
        }),
        tutorialSteps: [
            { text: "Match 4 to create a Rocket! 🚀 Rockets clear a whole line.", highlight: [{r:2, c:4}, {r:3, c:4}] }
        ]
    },
    {
        id: 3,
        name: "Bomb Blast",
        rows: 7,
        cols: 7,
        colors: ['🍎', '💎', '🍃', '⭐'],
        moves: 12,
        targetScore: 1500,
        iceCount: 0,
        // Match L shape
        // Grid setup to form L at (3,2)
        // (1,2)=0
        // (2,2)=0
        // (3,0)=0, (3,1)=0, (3,2)=1 (Swap Target)
        // (4,2)=0 (Swap Source)
        initialGrid: [
            ['1','2','3','1','2','3','1'],
            ['3','1','0','3','1','2','3'], // r1 c2=0
            ['2','3','0','0','2','3','1'], // r2 c2=0
            ['0','0','1','1','0','1','2'], // r3 c0=0 c1=0 c2=1
            ['3','1','0','0','3','1','2'], // r4 c2=0 (Swap UP)
            ['2','3','1','0','2','3','1'],
            ['1','2','3','1','2','3','1']
        ].map((row, r) => {
             if (r===1) return ['3','1','0','3','1','2','3'];
             if (r===2) return ['2','3','0','2','2','3','1']; // c2=0
             if (r===3) return ['0','0','1','1','0','1','2']; 
             if (r===4) return ['3','1','0','2','3','1','2']; // c2=0
             return row.map((c, i) => ((r+i)%3 + 1).toString()); 
        }),
        tutorialSteps: [
            { text: "Match in an L or T shape to make a Bomb! 💣", highlight: [{r:3, c:2}, {r:4, c:2}] }
        ]
    },
    {
        id: 4,
        name: "Magic Rainbow",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐', '🍇'],
        moves: 15,
        targetScore: 2000,
        iceCount: 0,
        // Match 5: 0 0 1 0 0 -> Swap vertical 0 into 1
        initialGrid: [
            ['1','2','3','4','1','2','3','4'],
            ['4','1','2','3','4','1','2','3'],
            ['3','4','1','2','0','4','1','2'], // r2 c4=0 (Swap Source)
            ['2','3','0','0','1','0','0','1'], // r3 c2=0 c3=0 c4=1(Target) c5=0 c6=0
            ['1','2','3','4','1','2','3','4'],
            ['4','1','2','3','4','1','2','3'],
            ['3','4','1','2','3','4','1','2'],
            ['2','3','4','1','2','3','4','1']
        ],
        tutorialSteps: [
            { text: "Match 5 to create a Magic Rainbow! 🌈 It clears all tiles of one color.", highlight: [{r:2, c:4}, {r:3, c:4}] }
        ]
    },
    {
        id: 5,
        name: "Box Breaker",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐'],
        moves: 15,
        targetScore: 2000,
        iceCount: 0,
        collectionTargets: [{ type: 'WOOD', count: 3 }],
        // Swap (3,4 '1') with (2,4 '0') to match 0s next to Wood
        initialGrid: [
            ['1','2','3','0','1','2','3','0'],
            ['3','0','1','W','W','W','1','2'],
            ['2','3','0','W','0','W','0','1'], // r2 c4=0
            ['0','1','2','0','1','0','2','3'], // r3 c4=1
            ['1','2','3','0','1','2','3','0'],
            ['3','0','1','2','3','0','1','2'],
            ['2','3','0','1','2','3','0','1'],
            ['0','1','2','3','0','1','2','3']
        ],
        tutorialSteps: [
            { text: "Match next to Boxes 📦 to break them!", highlight: [{r:2, c:4}, {r:3, c:4}] }
        ]
    },
    {
        id: 6,
        name: "Stone Wall",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐'],
        moves: 15,
        targetScore: 2000,
        iceCount: 0,
        collectionTargets: [{ type: '🍎', count: 6 }],
        // Move 0 to make 4-match row under stones
        initialGrid: [
            ['1','2','3','S','1','2','3','0'],
            ['3','0','1','S','2','3','0','1'],
            ['2','3','0','S','0','1','2','3'], 
            ['0','1','0','0','1','0','0','2'], // r3: 0 1 0 0 1 0 0 2
            // Swap (3,4 '1') with (4,4 '0') from below?
            ['1','2','3','0','0','2','3','0'], // r4 c4=0
            ['3','0','1','S','1','0','1','2'], 
            ['2','3','0','S','2','3','0','1'],
            ['0','1','2','S','0','1','2','3']
        ],
        tutorialSteps: [
            { text: "Stones 🪨 cannot be destroyed. Move tiles around them.", highlight: [{r:3, c:4}, {r:4, c:4}] }
        ]
    },
    {
        id: 7,
        name: "Unlock The Fun",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐', '🍇'],
        moves: 25,
        targetScore: 3000,
        iceCount: 0,
        collectionTargets: [{ type: 'LOCK', count: 6 }],
        // Layout: Blocks of locks, requiring matches to open.
        initialGrid: [
             ['1','2','3','4','1','2','3','4'],
             ['2','3','4','1','2','3','4','1'],
             ['3','4','0L','1L','2L','3L','4','2'], // 4 Locks
             ['4','1','2','0L','1L','0','1','3'],   // 2 Locks
             ['1','2','3','4','1','2','3','4'],
             ['2','3','4','1','2','3','4','1'],
             ['3','4','1','2','3','4','1','2'],
             ['4','1','2','3','4','1','2','3']
        ],
        tutorialSteps: [
            { text: "Locked tiles 🔒 need to be matched to open. Clear all 6 locks!", highlight: [] }
        ]
    },
    {
        id: 8,
        name: "Jelly Time",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐', '🍇'],
        moves: 25,
        targetScore: 3500,
        iceCount: 0,
        collectionTargets: [{ type: 'JELLY', count: 12 }],
        // Layout: 4x3 block of jelly in the center
        initialGrid: [
             ['1','2','3','4','1','2','3','4'],
             ['2','3','4','1','2','3','4','1'],
             ['3','4','0A','1A','2A','3A','4','2'],
             ['4','1','1A','2A','3A','4A','1','3'],
             ['1','2','2A','3A','4A','0A','3','4'],
             ['2','3','4','1','2','3','4','1'],
             ['3','4','1','2','3','4','1','2'],
             ['4','1','2','3','4','1','2','3']
        ],
        tutorialSteps: [
            { text: "Jelly 🦠 is spreading! Clear the patch by making matches on top.", highlight: [] }
        ]
    },
    {
        id: 9,
        name: "Big Combo",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐', '🍇'],
        moves: 20,
        targetScore: 1500,
        iceCount: 0,
        initialGrid: [
            ['1','2','3','4','1','2','3','4'],
            ['4','1','2','3','4','1','2','3'],
            ['3','4','1','2','3','4','1','2'],
            ['2','3','4','B','R','1','2','3'], // Bomb + Rocket
            ['1','2','3','4','1','2','3','4'],
            ['4','1','2','3','4','1','2','3'],
            ['3','4','1','2','3','4','1','2'],
            ['2','3','4','1','2','3','4','1']
        ],
        tutorialSteps: [
            { text: "Swap two special items to trigger a massive combo!", highlight: [{r:3, c:3}, {r:3, c:4}] }
        ]
    },
    {
        id: 10,
        name: "First Challenge",
        rows: 8,
        cols: 8,
        colors: ['🍎', '💎', '🍃', '⭐', '🍇'], 
        moves: 25,
        targetScore: 4000,
        iceCount: 0,
        initialGrid: [
             ['1','2','3','W','W','3','2','1'],
             ['2','3','1','W','W','1','3','2'],
             ['3','1','2','0','0','2','1','3'],
             ['1','2','0','1','2','0','2','1'],
             ['2','3','1','2','1','3','1','2'],
             ['3','1','2','1','2','1','2','3'],
             ['1','2','3','2','3','2','3','1'],
             ['2','3','1','3','1','3','1','2']
        ]
    }
];
