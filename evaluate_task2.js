const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const getSonarProperties = (propertyName) => {
    const propertiesPath = path.join(__dirname, 'express', 'sonar-project.properties');
    
    console.log("Fetching property from sonar-project.properties...");
    try {
        const content = fs.readFileSync(propertiesPath, 'utf8');
        const lines = content.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            if (!line.includes('=')) continue;

            const [key, value] = line.split('=');

            if (key.trim() === propertyName) {
                return value.trim(); 
            }
        }
    } catch (error) {
        console.error(`Could not read sonar-project.properties: ${error.message}`);
    }
    return null;
};

const EXPRESS_PATH = './express';
const PROJECT_KEY = getSonarProperties('sonar.projectKey');
const TOKEN = getSonarProperties('sonar.token');
const SONAR_AUTH = `${TOKEN}:`;

const runEvaluation = (assistantName) => {
    const resultsDir = path.join(__dirname, 'results/task2');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilePath = path.join(resultsDir, `Task2_${assistantName}_${timestamp}.json`);

    console.log(`\nStarting evaluation for: [${assistantName}]`);

    let testSummary = {passing: 0, failing: 0};

    // Run Tests
    try {
        console.log("Running tests...");
        const testsOutput = execSync('npm test -- --no-bail --timeout 5000 --exit', {encoding: 'utf8', cwd: EXPRESS_PATH});
        
        const failingTests = testsOutput.match(/(\d+) failing/);
        const passingTests = testsOutput.match(/(\d+) passing/);
        
        if (failingTests) {
            testSummary.failing = parseInt(failingTests[1]);
        } else {
            testSummary.failing = 0;
        }
        if (passingTests) {
            testSummary.passing = parseInt(passingTests[1]);
        } else {
            testSummary.passing = 0;
        }
    } catch (e) {
        const output = e.stdout;
        const failingTests = output.match(/(\d+) failing/);
        const passingTests = output.match(/(\d+) passing/);
        if (failingTests) {
            testSummary.failing = parseInt(failingTests[1]);
        } else {
            testSummary.failing = 0;
        }
        if (passingTests) {
            testSummary.passing = parseInt(passingTests[1]);
        } else {
            testSummary.passing = 0;
        }
    }

    // Run SonarQube
    try {
        console.log("Running SonarQube scan...");
        execSync('npx sonarqube-scanner@4.2.0', {cwd: EXPRESS_PATH, stdio: 'inherit'});

        const reportPath = path.join(EXPRESS_PATH, '.sonar', 'report-task.txt');
        const reportContent = fs.readFileSync(reportPath, 'utf8');
        const ceTaskId = reportContent.match(/ceTaskId=(.*)/)[1];
        const serverUrl = reportContent.match(/serverUrl=(.*)/)[1];

        console.log(`Polling...`);
        let taskStatus;
        while (true) {
            const task = `${serverUrl}/api/ce/task?id=${ceTaskId}`;
            const response = execSync(`curl -s -u "${SONAR_AUTH}" "${task}"`, {encoding: 'utf8'}).trim();
            const taskData = JSON.parse(response);
            taskStatus = taskData.task.status;
            if (taskStatus === 'SUCCESS') {
                break;
            }
            console.log(`waiting 2s...`);
            execSync('node -e "setTimeout(()=>{}, 2000)"'); 
        }

        console.log("Fetching metrics...");

        const metricsUrl = `${serverUrl}/api/measures/component?component=${PROJECT_KEY}&metricKeys=code_smells,sqale_index,duplicated_lines_density`;
        const metricsResponse = execSync(`curl -s -u "${SONAR_AUTH}" "${metricsUrl}"`, {encoding: 'utf8'});
        const metricsData = JSON.parse(metricsResponse);
        
        const sonarSmells = metricsData.component.measures.find(m => m.metric === 'code_smells')?.value;
        const debtMinutes = metricsData.component.measures.find(m => m.metric === 'sqale_index')?.value;
        const rawDensity = metricsData.component.measures.find(m => m.metric === 'duplicated_lines_density')?.value;

        const duplications = parseFloat(rawDensity);
    
        console.log("🔍 Fetching Rule Distribution...");
        const rulesUrl = `${serverUrl}/api/issues/search?componentKeys=${PROJECT_KEY}&types=CODE_SMELL&facets=rules&resolved=false&ps=1`;
        const rulesResponse = execSync(`curl -s -u "${SONAR_AUTH}" "${rulesUrl}"`, {encoding: 'utf8'});
        const rulesData = JSON.parse(rulesResponse);

        const activeSmellRules = {};
        const facet = rulesData.facets.find(f => f.property === 'rules');

        if (facet) {
            facet.values.forEach(rule => {
                activeSmellRules[rule.val] = rule.count;
            });
        }
        // Save Report
        const finalReport = {
            assistant: assistantName,
            timestamp: new Date().toISOString(),
            tests: testSummary,
            sonarqube: {
                total_smells: parseInt(sonarSmells),
                tech_debt: parseInt(debtMinutes),
                duplications: duplications,
                active_smell_rules: activeSmellRules
            }
        };

        fs.writeFileSync(resultFilePath, JSON.stringify(finalReport, null, 2));
        
        console.log(`\nEvaluation Complete!`);
        console.log(`Smells: ${sonarSmells} | Debt: ${debtMinutes}m | Duplications: ${duplications}`);
        console.log(`Saved to: ${resultFilePath}`);

    } catch (e) {
        console.error("Evaluation Failed:", e.message);
    }
};

const assistant = process.argv[2] || "Not Specified";
runEvaluation(assistant);