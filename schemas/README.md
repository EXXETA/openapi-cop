# Adding test schemas

When adding a new test OpenAPI document keep in mind that

- a v2 as well as a v3 document is provided
- both schemas are equivalent
- for every operation within a path, a 'operationId' is provided, otherwise the mock server is not able to generate mock responses, nor is a validator created for the given operation
- files that are referenced locally (with a JSON reference '$ref') should be placed in the 'refs' folder
