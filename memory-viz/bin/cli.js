#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { draw } = require("memory-viz");
const { program } = require("commander");
const { json } = require("node:stream/consumers");

function parseFilePath(input) {
    if (input) {
        return pathExists(input, `File`);
    } else {
        return undefined;
    }
}

function parseOutputPath(input) {
    return pathExists(input, `Output path`);
}

// helper function for parsing paths
function pathExists(inputPath, errMsg) {
    const fullPath = path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`Error: ${errMsg} ${fullPath} does not exist.`);
        process.exit(1);
    } else {
        return fullPath;
    }
}

function parseRoughjsConfig(input) {
    const pairs = input.split(",");
    const keyValuePairs = pairs.map((pair) => pair.split("="));
    return Object.fromEntries(keyValuePairs);
}

program
    .description(
        "Command line interface for generating memory model diagrams with MemoryViz"
    )
    .argument(
        "[filePath]",
        "path to a file containing MemoryViz-compatible JSON",
        parseFilePath
    )
    .option(
        "--output <path>",
        "writes generated SVG to specified path",
        parseOutputPath
    )
    .option("--width <value>", "width of generated SVG", "1300")
    .option("--height <value>", "height of generated SVG")
    .option(
        "--roughjs-config <key1=value1,key2=value2,...>",
        "options to configure how the SVG is drawn" +
            " - refer to rough.js documentation for available options",
        parseRoughjsConfig
    );

program.parse();
const filePath = program.processedArgs[0];
const options = program.opts();

if (filePath) {
    const fileContent = fs.readFileSync(filePath, "utf8");

    let jsonContent;
    try {
        jsonContent = JSON.parse(fileContent);
    } catch (err) {
        console.error(`Error: Invalid JSON\n${err.message}.`);
        process.exit(1);
    }

    runMemoryViz(jsonContent);
} else {
    json(process.stdin)
        .then((jsonContent) => {
            runMemoryViz(jsonContent);
        })
        .catch((err) => {
            console.error(`Error: ${err.message}.`);
            process.exit(1);
        });
}

function runMemoryViz(jsonContent) {
    let m;
    try {
        m = draw(jsonContent, true, {
            width: options.width,
            height: options.height,
            roughjs_config: { options: options.roughjsConfig },
        });
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }

    try {
        if (options.output) {
            const outputName = path.parse(options.output).name + ".svg";
            const outputPath = path.join(options.output, outputName);
            m.save(outputPath);
        } else {
            m.save();
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
