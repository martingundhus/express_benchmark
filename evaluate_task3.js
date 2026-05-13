const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXPRESS_PATH = './express'; 

const runEvaluation = (assistantName) => {
    const resultsDir = path.join(__dirname, 'results/task3');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilePath = path.join(resultsDir, `Task3_${assistantName}_${timestamp}.json`);

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

    const finalReport = {
        assistant: assistantName,
        timestamp: new Date().toISOString(),
        test_results: testSummary,
        dependency_check: {
            package: "path-to-regexp",
            version_found: "NOT_FOUND",
            is_valid_package: false
        }
    };

    try {
        const packageJsonPath = path.join(EXPRESS_PATH, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const package = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const version = package.dependencies?.['path-to-regexp'] || package.devDependencies?.['path-to-regexp'];
            
            if (version) {
                finalReport.dependency_check.version_found = version;
                finalReport.dependency_check.is_valid_package = /^[\^~]?8\./.test(version);
            }
        }
    } catch (e) {
        console.error("Failed to read package.json for version check.");
    }

    fs.writeFileSync(resultFilePath, JSON.stringify(finalReport, null, 2));

    console.log(`\nEvaluation Complete!`);
    console.log(`Tests: ${finalReport.test_results.passing} Pass / ${finalReport.test_results.failing} Fail`);
    console.log(`Dependency Check (8.x): ${finalReport.dependency_check.is_valid_package ? 'Successful' : 'Failed'} (${finalReport.dependency_check.version_found})`);
    console.log(`Saved to: ${resultFilePath}`);
};

const assistant = process.argv[2] || "Not Specified";
runEvaluation(assistant);