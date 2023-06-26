import { Observable, combineLatest, merge } from "rxjs";

export type TaskFunction = (...args: any[]) => any | Promise<any>;

export interface WorkflowDSLOptions {
    tasks: Record<string, TaskFunction>;
    concurrency: number;
    errorHandler: (error: Error, task: string) => void;
    progressReporter: (task: string, status: string) => void;
}

export class WorkflowDSL {
    private tasks: Record<string, TaskFunction>;
    private concurrency: number;
    private errorHandler: (error: Error, task: string) => void;
    private progressReporter: (task: string, status: string) => void;

    constructor(options: WorkflowDSLOptions) {
        this.tasks = options.tasks;
        this.concurrency = options.concurrency;
        this.errorHandler = options.errorHandler;
        this.progressReporter = options.progressReporter;
    }

    public async run(): Promise<void> {
        const taskNames = Object.keys(this.tasks);
        const taskDependencies = this.getTaskDependencies();

        const taskObservables = taskNames.map((taskName) => {
            const taskFunction = this.tasks[taskName];
            const dependencies = taskDependencies[taskName];

            return new Observable<void>((subscriber) => {
                const runTask = async () => {
                    try {
                        this.progressReporter(taskName, "started");
                        const args = dependencies.map((dep) => this.tasks[dep]);
                        const result = await taskFunction(...args);
                        this.tasks[taskName] = result;
                        this.progressReporter(taskName, "completed");
                        subscriber.next();
                        subscriber.complete();
                    } catch (error) {
                        this.errorHandler(error, taskName);
                        subscriber.complete(); // Change this line
                    }
                };

                if (dependencies.length === 0) {
                    runTask();
                } else {
                    const dependencyObservables = dependencies.map(
                        (dep) => taskObservables[taskNames.indexOf(dep)]
                    );
                    combineLatest(dependencyObservables).subscribe({
                        complete: runTask,
                    });
                }
            });
        });

        await new Promise<void>((resolve, reject) => {
            merge(...taskObservables, this.concurrency).subscribe({
                error: reject,
                complete: resolve,
            });
        });
    }

    private getTaskDependencies(): Record<string, string[]> {
        const taskDependencies: Record<string, string[]> = {};

        for (const taskName in this.tasks) {
            const taskFunction = this.tasks[taskName];
            const argNames = this.getFunctionArgumentNames(taskFunction);
            taskDependencies[taskName] = argNames;
        }

        return taskDependencies;
    }

    private getFunctionArgumentNames(func: Function): string[] {
        const funcString = func.toString();
        const argString = funcString.slice(
            funcString.indexOf("(") + 1,
            funcString.indexOf(")")
        );
        const argNames = argString
            .split(",")
            .map((arg) => arg.trim())
            .filter((arg) => arg.length > 0);

        return argNames;
    }
}
