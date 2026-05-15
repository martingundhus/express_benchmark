const fs = require('fs');
const path = require('path');

const RESULTS_DIR = './results/task3';
const OUTPUT_FILE = './task3_summary.csv';

const summarizeTask3 = () => {
    if (!fs.existsSync(RESULTS_DIR)) {
        return console.error("Results not found.");
    }

    const files = fs.readdirSync(RESULTS_DIR);
    
    const headers = [
        'Assistant','Run','Tests','Passing','Failing','Pass_Rate','Package_Upgraded','Version_Found'
    ];
    
    let csvRows = [headers.join(',')];
    let stats = {};

    files.forEach((file, index) => {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const assistant = data.assistant;
        
        if (!assistant || assistant === '-') return;

        const total = data.test_results.passing + data.test_results.failing;
        const passRate = total > 0 ? ((data.test_results.passing / total) * 100).toFixed(1) + '%' : '0%';
        const packageSuccess = data.dependency_check.is_valid_package ? 'YES' : 'NO';

        if (!stats[assistant]) {
            stats[assistant] = {count: 0, sumPass: 0, sumPackage: 0};
        }
        stats[assistant].count++;
        stats[assistant].sumPass += data.test_results.passing;
        if (data.dependency_check.is_valid_package) stats[assistant].sumPackage++;

        csvRows.push([
            assistant,
            index + 1,
            total,
            data.test_results.passing,
            data.test_results.failing,
            passRate,
            packageSuccess,
            data.dependency_check.version_found
        ].join(','));
    });

    csvRows.push('Averages:');
    csvRows.push('Assistant,Avg_Tests_Passing,Package_Upgrade_Rate');

    Object.keys(stats).forEach(assistantName => {
        const assistantData = stats[assistantName];
        const averagePass = (assistantData.sumPass / assistantData.count).toFixed(2);
        const packageRate = ((assistantData.sumPackage / assistantData.count) * 100).toFixed(1) + '%';
        
        csvRows.push(`${assistantName}, ${averagePass},${packageRate}`);
    });

    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'));
    console.log(`Summary created.}`);
};

summarizeTask3();