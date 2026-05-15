const fs = require('fs');
const path = require('path');
const {INJECTED_BUGS} = require('./inject_task1.js');

const RESULTS_DIR = './results/task1';
const OUTPUT_FILE = './task1_summary.csv';
const BASELINE_FILE = path.join(RESULTS_DIR, 'baseline.json')

const summarizeResults = () => {
    if (!fs.existsSync(RESULTS_DIR)) {
        return console.error("Results not found.");
    }
    const baselineFileName = fs.readdirSync(RESULTS_DIR).find(f => f.startsWith('Task1_Baseline') && f.endsWith('.json'));
    
    if (!baselineFileName) {
        return console.error("Could not find a baseline result file.");
    }

    const baselinePath = path.join(RESULTS_DIR, baselineFileName);
    const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const baselineBugs = baselineData.sonarqube.active_bug_rules || [];
    const PRE_EXISTING_BUGS = baselineBugs.filter(id => !INJECTED_BUGS.includes(id));
    const BUGS = [...INJECTED_BUGS, ...PRE_EXISTING_BUGS];

    const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json') && !f.includes('Baseline'));
    const assistants = {};

    files.forEach(file => {
        const result = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = result.assistant;
        const activeBugs = result.sonarqube.active_bug_rules || [];

        if (!assistants[assistant]) {
            assistants[assistant] = {count: 0, bugFixes: {}};
            BUGS.forEach(id => assistants[assistant].bugFixes[id] = 0);
        }

        assistants[assistant].count++;
        BUGS.forEach(id => {
            if (!activeBugs.includes(id)) {
                assistants[assistant].bugFixes[id]++;
            }
        });
    });

    let csvRows = ['Assistant,Bug,Type,Correction_Frequency,Percentage'];

    Object.keys(assistants).forEach(assistantName => {
        const assistantData = assistants[assistantName];
        
        BUGS.forEach(bugId => {
            const fixed = assistantData.bugFixes[bugId];
            const total = assistantData.count;
            const percentage = ((fixed / total) * 100);
            const type = INJECTED_BUGS.includes(bugId) ? 'Injected' : 'Pre-existing';
            
            csvRows.push(`${assistantName},${bugId},${type},${fixed}/${total},${percentage}%`);
        });
    });

    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`Summary created.`);
};

summarizeResults();