export async function prompt(prompt): Promise<string> {
    let inputLines: string[] = [];
    let newlineCount = 0;
    let receivingInput = true;

    console.log(prompt + " When you're done, input three new lines in a row.");

    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (data) => {
        const input = data.trim();

        if (input === "") {
            newlineCount += 1;
            if (newlineCount >= 3) {
                receivingInput = false;
            }
        } else {
            newlineCount = 0; // reset the counter if there's any text
            if (receivingInput) {
                inputLines.push(input);
            }
        }
    };

    return new Promise((resolve, reject) => {
        process.stdin.on("data", onData);

        const checkDone = setInterval(() => {
            if (!receivingInput) {
                clearInterval(checkDone);
                process.stdin.removeListener("data", onData);
                resolve(inputLines.join("\n"));
            }
        }, 100);

        process.stdin.on("error", (err) => {
            reject(err);
        });
    });
}
