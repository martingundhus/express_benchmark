const { execSync } = require('child_process');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, 'express');

const taskNumber = process.argv[2];

if (taskNumber !== '1' && taskNumber !== '2' && taskNumber !== '3') {
    console.error("Error: Specify a task number (1, 2, or 3).");
    process.exit(1);
}

const BRANCH_REGEX = new RegExp(`([a-zA-Z]+)Task${taskNumber}Run\\d+`);
const EVALUATION_SCRIPT = `evaluate_task${taskNumber}.js`;
const SUMMARIZE_SCRIPT = `summarize_task${taskNumber}.js`;

const runAllEvaluations = () => {
    try {
        console.log("Fetching GitHub remotes...");
        execSync(`git -C "${PROJECT_PATH}" fetch --all --prune`, {stdio: 'inherit'});

        console.log("Storing branches...");
        const branchList = execSync(`git -C "${PROJECT_PATH}" branch -a`, {encoding: 'utf8'});
        
        // Processing the branch list, filtering by BRANCH_REGEX, and removing duplicates
        const branches = branchList.split('\n')
            .map(b => {
                let name = b.trim().replace('* ', '');
                if (name.startsWith('remotes/origin/')) {
                    name = name.replace('remotes/origin/', '');
                }
                return name;
            })
            .filter(b => BRANCH_REGEX.test(b))
            .filter((value, index, self) => self.indexOf(value) === index);

        if (branches.length === 0) {
            console.log(`No matching branches found.`);
            return;
        }

        console.log(`Found ${branches.length} branches...`);

        branches.forEach(branchName => {
            const match = branchName.match(BRANCH_REGEX);
            const assistantName = match[1]; 

            console.log(`Checking out branch: [${branchName}]...`);
            execSync(`git -C "${PROJECT_PATH}" checkout -f ${branchName}`, {stdio: 'inherit'});

            console.log(`Reseting environment for branch...`);
            execSync(`node reset_environment.js`, {stdio: 'inherit'});

            console.log(`Evaluating ${assistantName} on branch ${branchName}...`);
            execSync(`node ${EVALUATION_SCRIPT} "${assistantName}"`, {stdio: 'inherit'});
        });

        console.log("All evaluations finished.");

        console.log("Summarizing all data...");
        execSync(`node ${SUMMARIZE_SCRIPT}`, {stdio: 'inherit'});

    } catch (err) {
        console.error("Execution error:", err.message);
    }
};

runAllEvaluations();