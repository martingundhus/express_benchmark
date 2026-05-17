const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const runScript = (scriptName) => {
    console.log(`\nStarting: ${scriptName}...`);
    try {
        execSync(`node ${scriptName}`, {stdio: 'inherit'});
        console.log(`Finished: ${scriptName}.`);
    } catch (error) {
        console.error(`Error in ${scriptName}. Stopping master execution.`);
        process.exit(1);
    }
};

const runBenchmark = () => {
    console.log("Running benchmark...");

    removeResults();
    setupDirectories();
    runScript('reset_environment.js');

    runScript('run_baseline.js');

    runScript('run_task_evaluations.js 1');
    runScript('run_task_evaluations.js 2');
    runScript('run_task_evaluations.js 3');

    console.log("\nAll tasks completed.");
};

const removeResults = () => {
    const resultsPath = path.join(__dirname, '..', 'results');

    if (fs.existsSync(resultsPath)) {
        fs.rmSync(resultsPath, {recursive: true, force: true});
        console.log('Results folder removed.');
    }
};

const setupDirectories = () => {
    const folders = [
        'results/task1',
        'results/task2',
        'results/task3'
    ];
    folders.forEach(dir => {
        fs.mkdirSync(path.join(__dirname, '..', dir), {recursive: true});
    });

    console.log('Directories added.');
};

runBenchmark();