It should accept an object of named task functions
It should inspect each task function argument names to determine which tasks they depend on, e.g. `task2: (task1) => {...}` means task2 depends on task1
It should pass the return value of dependency tasks as the appropriate argument into downstream tasks.
It should run all tasks as immediately as possible once their dependencies are finished.
It should handle both syncronous and asyncronous tasks correctly
It should automatically wrap all tasks in Observables for efficient handling of asynchronicity.
It should include a run method that starts the execution of the workflow.
It should enforce the concurrency limit, ensuring no more than the specified maximum number of tasks are run simultaneously.
It should handle errors, calling the errorHandler function with the error and task name whenever an error occurs during task execution.
It should report progress, calling the progressReporter function with the task name and status whenever a task starts or completes.
