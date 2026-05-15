const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read and fetch properties from sonar-project.properties
const getSonarProperties = (propertyName) => {
    const propertiesPath = path.join(__dirname, '../express', 'sonar-project.properties');
    
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

const PROJECT_PATH = '../express';
const PROJECT_KEY = getSonarProperties('sonar.projectKey');
const TOKEN = getSonarProperties('sonar.token');
const SONAR_AUTH = `${TOKEN}:`;

const runEvaluation = (assistantName) => {
    const resultsDir = path.join(__dirname, '../results/task1');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilePath = path.join(resultsDir, `Task1_${assistantName}_${timestamp}.json`);

    console.log(`\nStarting evaluation for: [${assistantName}]`);

    let testSummary = {passing: 0, failing: 0};
    let sonarBugs = 0;
    let activeBugRules = [];

    // Run tests
    try {
        console.log("Running tests...");
        const testsOutput = execSync('npm test -- --no-bail --timeout 5000 --exit', {encoding: 'utf8', cwd: PROJECT_PATH});
        
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

    // Run SonarQube scan
    try {
        console.log("Running SonarQube scan...");
        execSync('npx sonarqube-scanner@4.2.0', {cwd: PROJECT_PATH, stdio: 'inherit'});

        const reportPath = path.join(PROJECT_PATH, '.sonar', 'report-task.txt');
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

        console.log("Fetching bug types");
        const bugsUrl = `${serverUrl}/api/issues/search?componentKeys=${PROJECT_KEY}&types=BUG&resolved=false`;
        const bugsResponse = execSync(`curl -s -u "${SONAR_AUTH}" "${bugsUrl}"`, {encoding: 'utf8'});
        const bugsData = JSON.parse(bugsResponse);

        activeBugRules = bugsData.issues.map(issue => issue.rule);

        const metricsUrl = `${serverUrl}/api/measures/component?component=${PROJECT_KEY}&metricKeys=bugs`;
        const metricsResponse = execSync(`curl -s -u "${SONAR_AUTH}" "${metricsUrl}"`, {encoding: 'utf8'});
        const metricsData = JSON.parse(metricsResponse);
        
        sonarBugs = metricsData.component.measures.find(m => m.metric === 'bugs')?.value;

    } catch (e) {
        console.error("SonarQube evaluation failed:", e.message);
    }

    // Save report
    const finalReport = {
        assistant: assistantName,
        timestamp: new Date().toISOString(),
        tests: testSummary,
        sonarqube: {
            total_bugs: parseInt(sonarBugs),
            active_bug_rules: activeBugRules
        }
    };

    fs.writeFileSync(resultFilePath, JSON.stringify(finalReport, null, 2));
    
    console.log(`\nEvaluation Complete!`);
    console.log(`Results: ${testSummary.passing} Passed, ${testSummary.failing} Failed | Sonar Bugs: ${sonarBugs}`);
    console.log(`Saved to: ${resultFilePath}`);
};

const assistant = process.argv[2] || "Not Specified";
runEvaluation(assistant);