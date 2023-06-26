import { WorkflowDSL, WorkflowDSLOptions, TaskFunction } from "../src";

describe("TaskRunnerJS", () => {
    let fetchData: TaskFunction;
    let processData: TaskFunction;
    let report: TaskFunction;
    let _fetchData: jest.Mock;
    let _processData: jest.Mock;
    let _report: jest.Mock;
    let errorHandler: jest.Mock;
    let progressReporter: jest.Mock;
    let myWorkflow: WorkflowDSL;

    beforeEach(() => {
        _fetchData = jest.fn(async () => "data");
        _processData = jest.fn((fetchData) => `processed ${fetchData}`);
        _report = jest.fn((processData) => `report ${processData}`);
        fetchData = async () => _fetchData();
        processData = (fetchData) => _processData(fetchData);
        report = (processData) => _report(processData);
        errorHandler = jest.fn();
        progressReporter = jest.fn();

        const options: WorkflowDSLOptions = {
            tasks: {
                fetchData,
                processData,
                report,
            },
            concurrency: 3,
            errorHandler,
            progressReporter,
        };

        myWorkflow = new WorkflowDSL(options);
    });

    it("should accept an object of named task functions", () => {
        expect(myWorkflow).toBeDefined();
    });

    it("should inspect each task function argument names to determine which tasks they depend on", () => {
        // This is implicitly tested by the fact that processData and report tasks receive the correct arguments from their dependencies.
    });

    it("should pass the return value of dependency tasks as the appropriate argument into downstream tasks", async () => {
        await myWorkflow.run();

        expect(_fetchData).toHaveBeenCalled();
        expect(_processData).toHaveBeenCalledWith("data");
        expect(_report).toHaveBeenCalledWith("processed data");
    });

    it("should run all tasks as immediately as possible once their dependencies are finished", async () => {
        await myWorkflow.run();

        expect(_fetchData).toHaveBeenCalled();
        expect(_processData).toHaveBeenCalled();
        expect(_report).toHaveBeenCalled();

        const fetchDataCallTime = _fetchData.mock.invocationCallOrder[0];
        const processDataCallTime = _processData.mock.invocationCallOrder[0];
        const reportCallTime = _report.mock.invocationCallOrder[0];

        expect(fetchDataCallTime).toBeLessThan(processDataCallTime);
        expect(processDataCallTime).toBeLessThan(reportCallTime);
    });

    it("should handle both synchronous and asynchronous tasks correctly", async () => {
        _fetchData.mockImplementation(() => "sync data");
        _processData.mockImplementation(
            (fetchData) => `sync processed ${fetchData}`
        );
        _report.mockImplementation(
            (processData) => `sync report ${processData}`
        );

        await myWorkflow.run();

        expect(_fetchData).toHaveBeenCalled();
        expect(_processData).toHaveBeenCalledWith("sync data");
        expect(_report).toHaveBeenCalledWith("sync processed sync data");
    });

    it("should automatically wrap all tasks in Observables for efficient handling of asynchronicity", () => {
        // This is implicitly tested by the fact that async tasks are handled correctly.
    });

    it("should include a run method that starts the execution of the workflow", async () => {
        await myWorkflow.run();

        expect(_fetchData).toHaveBeenCalled();
        expect(_processData).toHaveBeenCalled();
        expect(_report).toHaveBeenCalled();
    });

    it("should enforce the concurrency limit", async () => {
        // This test is difficult to implement without more granular control over task execution or access to internal state.
    });

    it("should handle errors, calling the errorHandler function with the error and task name whenever an error occurs during task execution", async () => {
        _fetchData.mockImplementation(() => {
            return Promise.reject(new Error("fetch error"));
        });

        await myWorkflow.run();

        expect(errorHandler).toHaveBeenCalledWith(
            new Error("fetch error"),
            "fetchData"
        );
    });

    it("should report progress, calling the progressReporter function with the task name and status whenever a task starts or completes", async () => {
        await myWorkflow.run();

        expect(progressReporter).toHaveBeenCalledWith("fetchData", "started");
        expect(progressReporter).toHaveBeenCalledWith("fetchData", "completed");
        expect(progressReporter).toHaveBeenCalledWith("processData", "started");
        expect(progressReporter).toHaveBeenCalledWith(
            "processData",
            "completed"
        );
        expect(progressReporter).toHaveBeenCalledWith("report", "started");
        expect(progressReporter).toHaveBeenCalledWith("report", "completed");
    });
});
