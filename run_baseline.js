const { execSync } = require('child_process');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, 'express');
const BASELINE = 'Baseline';
const EVALUATION_TASKS = [
    'evaluate_task1.js',
    'evaluate_task2.js'
];

const evaluateBaseline = () => {
    try {
        console.log("Fetching GitHub remotes...");
        execSync(`git -C "${PROJECT_PATH}" fetch --all --prune`, {stdio: 'inherit'});

        console.log("Storing branches...");
        const branchList = execSync(`git -C "${PROJECT_PATH}" branch -a`, {encoding: 'utf8'});
        
        // Processing the branch list and removing duplicates
        const branches = branchList.split('\n')
            .map(b => {
                let name = b.trim().replace('* ', '');
                if (name.startsWith('remotes/origin/')) {
                    name = name.replace('remotes/origin/', '');
                }
                return name;
            })
            .filter(b => b === BASELINE)
            .filter((value, index, self) => self.indexOf(value) === index);

        if (branches.length === 0) {
            console.log(`No baseline branch found.`);
            return;
        }

        console.log(`Found baseline branch...`);
        const branchName = branches[0];

        console.log(`Checking out branch...`);
        execSync(`git -C "${PROJECT_PATH}" checkout -f ${branchName}`, {stdio: 'inherit'});

        console.log(`Resetting environment for branch...`);
        execSync(`node reset_environment.js`, {stdio: 'inherit'});

        for (const task of EVALUATION_TASKS) {
            execSync(`node ${task} "${BASELINE}"`, {stdio: 'inherit'});
        }

    } catch (err) {
        console.error("Execution error:", err.message);
    }
};

evaluateBaseline();