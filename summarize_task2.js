const fs = require('fs');
const path = require('path');

const RESULTS_DIR = './results/task2';
const OUTPUT_FILE = './task2_summary.csv';

const BASELINE = {
    assistant: '-', run:'Baseline', tests: 1166, smells: 448, ruleTypes: 27, debt: 2389, duplications: 1
};

const summarizeTask2 = () => {
    if (!fs.existsSync(RESULTS_DIR)) {
        return console.error("Results not found.");
    }

    const files = fs.readdirSync(RESULTS_DIR);
    
    const headers = [
        'assistant', 'Run', 'Tests', 'Smells', 'Smells_Delta', 
        'Rule_Types', 'Types_Delta', 'Tech_Debt_Mins', 'Debt_Delta', 
        'Duplications', 'Dup_Delta'
    ];
    
    let csvRows = [headers.join(',')];
    let stats = {}; 

    // Push baseline
    csvRows.push([
        BASELINE.assistant, BASELINE.run, BASELINE.tests, BASELINE.smells, '-', 
        BASELINE.ruleTypes, '-', BASELINE.debt, '-', BASELINE.duplications, '-'
    ].join(','));

    files.forEach((file, index) => {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = data.assistant;
        
        if (!assistant || assistant === '-') return;

        const rulesObj = data.sonarqube.active_smell_rules || {};
        const ruleCount = Object.keys(rulesObj).length;

        const current = {
            smells: data.sonarqube.total_smells || 0,
            ruleTypes: ruleCount,
            debt: data.sonarqube.tech_debt || 0,
            duplications: data.sonarqube.duplications || 0
        };

        const deltas = {
            smells: current.smells - BASELINE.smells,
            types: current.ruleTypes - BASELINE.ruleTypes,
            debt: current.debt - BASELINE.debt,
            dups: current.duplications - BASELINE.duplications
        };

        if (!stats[assistant]) {
            stats[assistant] = { 
                count: 0, 
                sumSmellsDelta: 0, 
                sumTypesDelta: 0, 
                sumDebtDelta: 0,
                sumDupsDelta: 0
            };
        }

        stats[assistant].count++;
        stats[assistant].sumSmellsDelta += deltas.smells;
        stats[assistant].sumTypesDelta += deltas.types;
        stats[assistant].sumDebtDelta += deltas.debt;
        stats[assistant].sumDupsDelta += deltas.dups;

        csvRows.push([
            assistant, index + 1, (data.tests.passing + data.tests.failing),
            current.smells, deltas.smells, current.ruleTypes, deltas.types,
            current.debt, deltas.debt, current.duplications, deltas.dups
        ].join(','));
    });

    csvRows.push('\n');
    csvRows.push('Averages:');
    csvRows.push('Assistant, Average_Smells_Delta, Average_Rule_Types_Delta, Average_Debt_Delta, Average_Dup_Delta');

    Object.keys(stats).forEach(assistantName => {
        const assistantData = stats[assistantName];
        if (assistantData.count === 0) return;

        const avgSmells = (assistantData.sumSmellsDelta / assistantData.count).toFixed(2);
        const avgTypes = (assistantData.sumTypesDelta / assistantData.count).toFixed(2);
        const avgDebt = (assistantData.sumDebtDelta / assistantData.count).toFixed(2);
        const avgDups = (assistantData.sumDupsDelta / assistantData.count).toFixed(2);

        csvRows.push(`${assistantName}, ${avgSmells}, ${avgTypes}, ${avgDebt}, ${avgDups}`);
    });

    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`Summary created.`);
};

summarizeTask2();