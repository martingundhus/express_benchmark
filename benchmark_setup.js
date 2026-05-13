const fs = require('fs');
const path = require('path');

const benchmarkSetup = () => {
    const folders = [
        'results/task1', 
        'results/task2', 
        'results/task3',
    ];

    folders.forEach(dir => {
        fs.mkdirSync(path.join(__dirname, dir), {recursive: true});
    });
    
    console.log('Directories added.');
};

benchmarkSetup();