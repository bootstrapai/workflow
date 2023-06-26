import APIQueue from "openai-queue";
import Agent from "openai-queue/dist/agent";
import * as dotenv from "dotenv";
import { dynamicImport } from "tsimportlib";
import { readFile, writeFile } from "fs/promises";
import { prompt } from "./prompt";
// import inquirer from "inquirer";
dotenv.config();
Agent.api = new APIQueue(process.env.API_KEY);

const main = async () => {
    const { default: inquirer } = await dynamicImport("inquirer", module);
    const root = Agent.create({ model: "gpt-4", temperature: 0.5 });

    let _continue = true;
    while (_continue) {
        const { more } = await inquirer.prompt({
            type: "confirm",
            name: "more",
            message: "Do you have more failing tests?",
            default: false,
        });
        if (!more) {
            _continue = false;
            continue;
        }

        const debug = root.system(`
The user will give you a failing test, your job is to determine whether the error is in the tests or the implementation, and provide a fix. 

## Tests
${await readFile("./__tests__/index.ts")}
## Implementation
${await readFile("./src/index.ts")}
`);
        console.log(debug.messages);

        const failure = await prompt("please paste the failing test");

        console.log("attempting to debug");
        const fix = await debug(failure);

        console.log(fix.content);
    }
};

main();
