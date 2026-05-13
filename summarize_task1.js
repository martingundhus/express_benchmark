const fs = require('fs');
const path = require('path');

const RESULTS_DIR = './results/task1';
const OUTPUT_FILE = './task1_summary.csv';

const INJECTED_BUGS = [
    "javascript:S4125",
    "javascript:S7736",
    "javascript:S6523",
    "javascript:S1226",
    "javascript:S930",
    "javascript:S3500"
];

const PRE_EXISTING_BUGS = [
    "javascript:S2999"
];

const summarizePerformance = () => {
    if (!fs.existsSync(RESULTS_DIR)) {
        return console.error("Results not found.");
    }

    const files = fs.readdirSync(RESULTS_DIR);
    const assistants = {};

    // 1. Group data by assistant
    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = data.assistant;
        const activeBugs = data.sonarqube.active_bug_rules || [];

        if (!assistants[assistant]) {
            assistants[assistant] = {count: 0, bugFixes: {}};
            [...INJECTED_BUGS, ...PRE_EXISTING_BUGS].forEach(id => assistants[assistant].bugFixes[id] = 0);
        }

        assistants[assistant].count++;
        [...INJECTED_BUGS, ...PRE_EXISTING_BUGS].forEach(id => {
            if (!activeBugs.includes(id)) {
                assistants[assistant].bugFixes[id]++;
            }
        });
    });

    let csvRows = ['Assistant, Bug_ID, Type, Correction Frequency, Percentage'];

    Object.keys(assistants).forEach(assistantName => {
        const assistantData = assistants[assistantName];
        
        [...INJECTED_BUGS, ...PRE_EXISTING_BUGS].forEach(bugId => {
            const fixed = assistantData.bugFixes[bugId];
            const total = assistantData.count;
            const percentage = ((fixed / total) * 100).toFixed(1);
            const type = INJECTED_BUGS.includes(bugId) ? 'Injected' : 'Pre-existing';
            
            csvRows.push(`${assistantName}, ${bugId}, ${type}, ${fixed}/${total}, ${percentage}%`);
        });
    });

    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`Summary created.`);
};

summarizePerformance();