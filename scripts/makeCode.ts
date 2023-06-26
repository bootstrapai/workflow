import APIQueue from "openai-queue";
import Agent from "openai-queue/dist/agent";
import * as dotenv from "dotenv";
import { dynamicImport } from "tsimportlib";
import { readFile, writeFile } from "fs/promises";
// import inquirer from "inquirer";
dotenv.config();
Agent.api = new APIQueue(process.env.API_KEY!);

const CODE = `
The user will give you a brief description of a piece of software, a list of requirements, a usage example, type definitions, and a test suite. 
Respond with a thorough implementation of the code to pass all tests, in typescript.
`;

const main = async () => {
    const root = Agent.create({ model: "gpt-4", temperature: 0.5 });
    const codeGen = root.system(CODE);
    const types = await readFile("./types/index.ts", "utf-8");
    const description = await readFile("./DESCRIPTION.MD", "utf-8");
    const requirements = await readFile("./REQUIREMENTS.MD", "utf-8");
    const usage = await readFile("./USAGE.MD", "utf-8");
    const tests = await readFile("./__tests__/index.ts");
    const code = await codeGen(
        `# Description\n${description}\n## Requirements\n${requirements}\n##\n Usage\n${usage}\n## Types\n \`\`\`typescript\n${types}\`\`\` ## Tests\n \`\`\`typescript${tests}\`\`\``
    );

    console.log(code.content);

    const fixed = await code(
        `Property 'combineLatest' does not exist on type 'typeof Observable'.`
    );

    console.log(fixed.content);
};

main();
