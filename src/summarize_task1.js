const fs = require('fs');
const path = require('path');
const {INJECTED_BUGS} = require('./inject_task1.js');

const RESULTS_DIR = '../results/task1';
const OUTPUT_FILE = '../reports/task1_summary.csv';

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

    const files = fs.readdirSync(RESULTS_DIR)
        .filter(f => f.endsWith('.json') && !f.includes('Baseline'))
        .sort();

    const assistants = {};

    files.forEach(file => {
        const result = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = result.assistant;
        const activeBugs = result.sonarqube.active_bug_rules || [];

        if (!assistant) return;

        if (!assistants[assistant]) {
            assistants[assistant] = {
                count: 0, 
                bugFixes: {}
            };
            BUGS.forEach(id => assistants[assistant].bugFixes[id] = 0);
        }

        assistants[assistant].count++;
        BUGS.forEach(id => {
            if (!activeBugs.includes(id)) {
                assistants[assistant].bugFixes[id]++;
            }
        });
    });

    let csvRows = ['Assistant,Bug,Bug_Type,Correction_Frequency,Percentage'];

    Object.keys(assistants).forEach(assistantName => {
        const assistantData = assistants[assistantName];
        const totalRuns = assistantData.count;

        BUGS.forEach(bugId => {
            const fixed = assistantData.bugFixes[bugId];
            const percentage = ((fixed / totalRuns) * 100).toFixed(0);
            const type = INJECTED_BUGS.includes(bugId) ? 'Injected' : 'Pre-existing';
            
            csvRows.push(`${assistantName},${bugId},${type},${fixed}/${totalRuns},${percentage}%`);
        });
    });

    csvRows.push('', ''); 
    csvRows.push('Test Results From Each Run:');
    csvRows.push('Assistant,Run,Tests_Passed,Tests_Failed');

    const runCounters = {};

    files.forEach(file => {
        const result = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = result.assistant;
        
        if (!assistant) {
            return;
        }

        if (!runCounters[assistant]) {
            runCounters[assistant] = 0;
        }
        runCounters[assistant]++;

        const passingTests = result.tests?.passing || 0;
        const failingTests = result.tests?.failing || 0;

        csvRows.push(`${assistant},${runCounters[assistant]},${passingTests},${failingTests}`);
    });

    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`Summary created with clean sequential run numbers.`);
};

summarizeResults();