const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_PATH = '../express'; 
const SONAR_CONFIG_PATH = path.join(PROJECT_PATH, 'sonar-project.properties');

const SONAR_CONFIG_CONTENT = `sonar.projectKey=hoho
sonar.sources=lib
sonar.host.url=http://localhost:9000
sonar.token=sqp_5d4771d4e9995f67897a18782c5838aa805fe260
sonar.scm.disabled=true
sonar.javascript.file.suffixes=.js`;

const resetEnvironment = () => {
    console.log("Reseting the environment...");

        // Deletes the project from the SonarQube server completely between runs
    try {
        console.log("Deleting old project data from SonarQube server...");
        execSync(`curl -s -u "${SONAR_AUTH}" -X POST "${serverUrl}/api/projects/delete?project=${PROJECT_KEY}"`);
    } catch (e) {
    }

    try {
        if (!fs.existsSync(PROJECT_PATH)) {
            throw new Error(`Directory ${PROJECT_PATH} not found.`);
        }

        execSync('git reset --hard HEAD', {cwd: PROJECT_PATH});
        execSync('git clean -fdx', {cwd: PROJECT_PATH});

        if (fs.existsSync(path.join(PROJECT_PATH, 'package.json'))) {
            console.log("Installing dependencies...");
            execSync('npm install', {cwd: PROJECT_PATH, stdio: 'ignore'});
        }

        console.log("Overwriting sonar-project.properties...");
        fs.writeFileSync(SONAR_CONFIG_PATH, SONAR_CONFIG_CONTENT);

        console.log("Environment is clean for next run.");
    } catch (error) {
        console.error("Reset failed:", error.message);
    }
};

resetEnvironment();