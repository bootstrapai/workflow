import APIQueue from "openai-queue";
import Agent from "openai-queue/dist/agent";
import * as dotenv from "dotenv";
import { dynamicImport } from "tsimportlib";
import { readFile, writeFile } from "fs/promises";
// import inquirer from "inquirer";
dotenv.config();
Agent.api = new APIQueue(process.env.API_KEY!);

const TESTS = `
The user will give you a brief description of a piece of software, a list of requirements, a usage example, and type definitions. 
Respond with a thorough jest test suite written in typescript that tests all the requirements.
assume the code under test is located in \`../src\`
`;

const main = async () => {
    const root = Agent.create({ model: "gpt-4", temperature: 0.5 });
    const testGen = root.system(TESTS);
    const types = await readFile("./types/index.ts", "utf-8");
    const description = await readFile("./DESCRIPTION.MD", "utf-8");
    const requirements = await readFile("./REQUIREMENTS.MD", "utf-8");
    const usage = await readFile("./USAGE.MD", "utf-8");
    const tests = await testGen(
        `# Description\n${description}\n## Requirements\n${requirements}\n##\n Usage\n${usage}\n## Types\n \`\`\`typescript\n${types}\`\`\``
    );

    console.log(tests.content);
    const checked = await tests(
        "please double check the test suite for alignment with the requirements, usage, and types"
    );
    console.log(checked.content);

    const fixed = await checked(
        "getting this error: Property 'toHaveBeenCalledBefore' does not exist on type 'JestMatchers<Mock<any, any, any>>'. Did you mean 'toHaveBeenCalled'?ts(2551). Please fix the tests"
    );

    console.log(fixed.content);

    const stub = await checked(
        "please give me a stub implementation of the code"
    );
    console.log(stub.content);
};

main();
