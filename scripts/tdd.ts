import APIQueue from "openai-queue";
import Agent from "openai-queue/dist/agent";
import * as dotenv from "dotenv";
import { dynamicImport } from "tsimportlib";
import { readFile, writeFile } from "fs/promises";
// import inquirer from "inquirer";
dotenv.config();
Agent.api = new APIQueue(process.env.API_KEY!);

const QUESTIONER = `
The user will give you a brief description of a piece of software and list of requirements. respond with a list of clarifying questions with the goal of discovering unstated requirements.
After each question, give a bulleted list of potential answers, in the form of "it should..." statements as complete sentences (they should not require the inclusion of the question to be understood)

Your questions will be parsed by the following code, be sure to provide suitable output:
${parseQuestions.toString()}
`;

const INITIAL_TYPES = `
The user will give you a description of a piece of software, and a list of requirements.
Respond with typescript definitions for the code.
export all types, interfaces, and classes. 
`;

const TYPES = `
The user will give you a description of a piece of software, a list of requirements and a set of typescript definitions.
Review the typescript definitions against the requirements. Respond with a brief summary of whether there is any conflict between the requirements and the types.
the last word of your output must be 'CHANGE' if there are changes needed to the types or 'PRESERVE' if they're fine.
`;

const main = async () => {
    const root = Agent.create({ model: "gpt-4", temperature: 0.5 });
    await gatherRequirements(root);
    await getTypes(root);
};

main();

async function getTypes(root: Agent) {
    const typeChecker = root.system(TYPES);
    const types = await readFile("./types/index.ts", "utf-8");
    const description = await readFile("./DESCRIPTION.MD", "utf-8");
    const requirements = await readFile("./REQUIREMENTS.MD", "utf-8");
    const checked = await typeChecker(
        `# Description\n${description}\n## Requirements\n${requirements}\n## Types\n \`\`\`typescript\n${types}\`\`\``
    );
    console.log(checked.content);
    if (checked.content.trim().includes("CHANGE")) {
        const improved = await checked(
            "please make the improvements, and provide a usage example with your improvements"
        );
        console.log(improved.content);
    } else {
        console.log(`we're good`);
    }
}

async function gatherRequirements(root: Agent) {
    const { default: inquirer } = await dynamicImport("inquirer", module);
    const requirementGenerator = root.system(QUESTIONER);

    const description = await readFile("./DESCRIPTION.MD", "utf-8");
    let requirements = await readFile("./REQUIREMENTS.MD", "utf-8");
    console.log("Current requirements:\n", requirements);

    let gatherMore = await inquirer.prompt({
        type: "confirm",
        name: "more",
        message: "Do you want to gather requirements?",
        default: false,
    });

    while (gatherMore.more) {
        const questions = await requirementGenerator(
            `# Description\n${description}\n## Requirements\n${requirements}`
        );
        console.log(questions.content);
        const prompts = parseQuestions(questions.content);
        const otherPrompts: any[] = [];
        for (let i = 0; i < prompts.length; i++) {
            otherPrompts.push(prompts[i]);
            otherPrompts.push({
                type: "input",
                name: `other${i}`,
                message: "Please specify your own answer:",
                // @ts-ignore
                when: (answers) => answers[prompts[i].name] === "other",
            });
        }

        const answers = await inquirer.prompt(otherPrompts);
        console.log(answers);
        for (const answer in answers) {
            if (answers[answer] === "skip") {
                continue;
            }
            requirements +=
                answers[answer] !== "other" ? answers[answer] + "\n" : "";
        }
        console.log("Updated requirements:\n", requirements);
        await writeFile("./REQUIREMENTS.MD", requirements);

        gatherMore = await inquirer.prompt({
            type: "confirm",
            name: "more",
            message: "Do you want to gather more requirements?",
            default: false,
        });
    }
}

function parseQuestions(input) {
    const lines = input.split("\n");
    const questions = [];
    let currentQuestion = null;

    for (const line of lines) {
        if (line.trim() === "") continue; // Skip empty lines

        // If line starts with a number, it's a new question
        if (/\d+\./.test(line)) {
            if (currentQuestion !== null) {
                // If there's a previous question, add it to the questions array
                currentQuestion.choices.push(
                    { name: "skip", value: "skip" },
                    { name: "other", value: "other" }
                );
                questions.push(currentQuestion);
            }
            // Start a new question
            currentQuestion = {
                type: "list",
                name: `question${questions.length + 1}`,
                message: line.split(".").slice(1).join(".").trim(), // Remove the numeric prefix
                choices: [],
                default: "skip",
            };
        } else if (currentQuestion !== null) {
            // If it's not a new question, it's a choice for the current question
            const choice = line.trim();
            if (choice.startsWith("- ")) {
                currentQuestion.choices.push({
                    name: choice.slice(2),
                    value: choice.slice(2),
                }); // Remove the leading '- '
            } else {
                currentQuestion.choices.push({ name: choice, value: choice });
            }
        }
    }

    // Don't forget to add the last question
    if (currentQuestion !== null) {
        currentQuestion.choices.push({ name: "skip", value: "skip" });
        questions.push(currentQuestion);
    }

    return questions;
}
