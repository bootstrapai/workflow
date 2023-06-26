export type TaskFunction = (...args: any[]) => any | Promise<any>;

export interface WorkflowDSLOptions {
    tasks: Record<string, TaskFunction>;
    concurrency: number;
    errorHandler: (error: Error, task: string) => void;
    progressReporter: (task: string, status: string) => void;
}

export declare class WorkflowDSL {
    constructor(options: WorkflowDSLOptions);
}
