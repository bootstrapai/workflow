import { prompt } from "./prompt";
import APIQueue from "openai-queue";
import Agent from "openai-queue/dist/agent";
import * as dotenv from "dotenv";
import { readFile } from "fs/promises";
dotenv.config();
Agent.api = new APIQueue(process.env.API_KEY!);
const STYLE = `
### Styleguide
- use typescript
- do not use implicit any
- when writing tests, use mocha, sinon, and chai as needed
- when writing code, target both nodejs and the browser
- output all your code inside markdown codeblocks for easy parsing
- minimize extra disclaimers or comments, stick to the code
`;

const REPARSE = `
Your code failed to parse. the user won't say anything, just return what they asked for correctly formatted inside a markdown codeblock
`;

const QUESTIONER = `
The user will present you with a description of some code they want. you will respond with a set of questions to clarify the specification.
`;

const MERGE_ANSWERS = `
The user is about to respond with the answers to your questions. instead of asking more questions, reply with their original description augmented with the answers to the questions
use language as if the code is already writen (like a readme).
`;

const PROGRAMMER = `
The user will give you a description of some code, along with a test suite. 
Respond with an implementation of the code that will pass all the tests.
`;

const TEST_GENERATOR = `
The user will give you a README for a piece of code.
Respond with a test suite for the code
`;

const LIBRARY = `
# TaskRunnerJS

TaskRunnerJS is a lightweight, promise-based JavaScript library for orchestrating complex sequences of asynchronous and synchronous tasks with automatic parallelization and sequential execution. It is designed for use in both Node.js (v16 or higher) and modern browser environments. TaskRunnerJS is perfect for managing complex flows with a concise syntax, making your code easy to understand and maintain.

## Features

- Easy-to-Use: Define your tasks and dependencies in a simple object structure. The library automatically handles both synchronous and asynchronous functions.
- Automatic Parallelization: Tasks without mutual dependencies are automatically run in parallel.
- Sequential Execution: Tasks with dependencies run sequentially after their dependencies resolve.
- Error Handling: In-built error handling to log errors and provide a list of downstream tasks that will not be triggered due to the error. Circular dependencies will throw an error.
- Progress Reporting: Get real-time updates about the execution of your tasks through simple events.
- Concurrent Control: User-configurable global concurrency control for the number of tasks that can run concurrently.
- Task Timeouts: Default 5-minute timeout for tasks to prevent hanging.
- Module Compatibility: Supports CommonJS, ES modules, and bundlers like Webpack and Rollup.
- External Dependencies: The library allows users to import and use other libraries within their tasks without any specific compatibility requirements.

## Example Usage

const { run } = require('TaskRunnerJS');

const results = run({
    task1: () => 4,
    task2: () => 2,
    task3: async (task1, task2) => {
        await new Promise(r => setTimeout(r,1000))
        return task1 + task2
    },
    // variable order doesn't matter
    task4: (task2, task1) => {
        return task1 * task2 * task2
    }
});

console.log(results);
/**
 * {
 *  task1: 4,
 *  task2: 2,
 *  task3: 6,
 *  task4: 16
 * }
**/
`;

const root = Agent.create({ model: "gpt-4", temperature: 0.4 });

const main = async () => {
    const questioner = root.system(QUESTIONER);
    let spec = LIBRARY;
    // for (let i = 0; i < 3; i++) {
    //     console.log("looking at your spec...");
    //     const questions = await questioner(spec);
    //     const answers = await prompt(questions.content);
    //     console.log("considering your answers...");
    //     const description = await questions.system(MERGE_ANSWERS)(answers);
    //     console.log("new spec:");
    //     console.log(description.content);
    //     spec = description.content;
    // }

    const styled = root.system(STYLE);

    const testGenerator = styled.system(TEST_GENERATOR);
    const programmer = styled.system(PROGRAMMER);

    const tests = await testGenerator(spec);
    console.log("tests:");
    console.log(tests.content);
    console.log("writing code");
    const code = await programmer(`${spec}\n${tests.content}`);
    console.log("code:");
    console.log(code.content);

    const errors = await prompt(`please output any errors`);
    console.log("processing errors");
    const result = await programmer.system(
        "The user will give you failing tests, please output the complete code with errors fixed"
    )(errors);
    console.log(result.content);
};

main();
