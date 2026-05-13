const fs = require('fs');
const path = require('path');

const EXPRESS_PATH = './express'; 
const files = {
    layer: path.join(EXPRESS_PATH, 'lib/router/layer.js'),
    route: path.join(EXPRESS_PATH, 'lib/router/route.js'),
    index: path.join(EXPRESS_PATH, 'lib/router/index.js'),
    response: path.join(EXPRESS_PATH, 'lib/response.js'),
    view: path.join(EXPRESS_PATH, 'lib/view.js')
};

const injectBugs = () => {
    console.log("Starting bug injection for Task 1");

    try {
        // Bug 1: Invalid typeof Use (S4125)
        let viewContent = fs.readFileSync(files.view, 'utf8');
        viewContent = viewContent.replace(
            "typeof fn !== 'function'",
            "typeof fn !== 'Function'"
        );
        fs.writeFileSync(files.view, viewContent);
        console.log("Bug 1 injected");

        // Bug 2: Extra Argument Passing (S930)
        let layerContent = fs.readFileSync(files.layer, 'utf8');
        layerContent = layerContent.replace(
            "this.params = {'0': decode_param(path)}",
            "this.params = {'0': decode_param(path, value)}"
        );
        fs.writeFileSync(files.layer, layerContent);
        console.log("Bug 2 injected");

        // Bug 3: Reassigning const Variable (S3500)
        let routeContent = fs.readFileSync(files.route, 'utf8');
        routeContent = routeContent.replace(
            "var idx = 0;",
            "const idx = 0;"
        );
        fs.writeFileSync(files.route, routeContent);
        console.log("Bug 3 injected");

        // Bug 4: Optional Chaining with Error (S6523)
        let indexContent = fs.readFileSync(files.index, 'utf8');
        indexContent = indexContent.replace(
            "var c = path[layerPath.length]",
            "var c = (path?.[layerPath.length]).toString()"
        );
        console.log("Bug 4 injected");

        // --- Bug 5: Negated Expression in Equality Check (S7736) ---
        let resContent = fs.readFileSync(files.response, 'utf8');
        resContent = resContent.replace(
            "if (streaming !== false && !done)",
            "if (!streaming === false && !done)"
        );
        fs.writeFileSync(files.response, resContent);
        console.log("Bug 5 injected");

        // Bug 6: Ignoring Function Variable (S1226)
        let indexLines = indexContent.split('\n');
        const targetSignature = "function paramCallback(err)";
        const lineIndex = indexLines.findIndex(line => line.includes(targetSignature));

        if (lineIndex !== -1) {
            indexLines.splice(lineIndex + 1, 0, '    err = new Error("Failed to process param");');
            indexContent = indexLines.join('\n');
            console.log("Bug 6 injected");
        }
        fs.writeFileSync(files.index, indexContent);

        console.log("All 6 bugs successfully injected.");
    } catch (err) {
        console.error("Injection failed:", err.message);
    }
};

injectBugs();