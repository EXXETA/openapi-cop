"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Maps a OpenAPI file by its name to an array of sample requests. The
 * requests are expected NOT to trigger a 404 response.
 */
exports.VALID_TEST_REQUESTS = {
    v3: {
        '2-path.yaml': [
            {
                method: 'POST',
                url: '/echo',
                data: JSON.stringify({ input: 'ECHO!' }),
            },
        ],
        '3-parameters.yaml': [
            {
                method: 'POST',
                url: '/pets/cats',
                data: JSON.stringify({ search: 'Garfield' }),
            },
        ],
        '4-refs.yaml': [
            {
                method: 'POST',
                url: '/echo',
                data: JSON.stringify({ input: 'ECHO!' }),
            },
        ],
        '5-external-refs.yaml': [
            {
                method: 'POST',
                url: '/echo',
                data: JSON.stringify({ input: 'ECHO!' }),
            },
        ],
        '6-examples.yaml': [
            { method: 'GET', url: '/pets' },
            {
                method: 'POST',
                url: '/pets',
                data: JSON.stringify({ search: 'Scooby' }),
            },
        ],
        '7-petstore.yaml': [
            { method: 'GET', url: '/pets' },
            { method: 'GET', url: '/pets/1' },
        ],
    },
};
exports.STRICTLY_VALID_TEST_REQUESTS = {
    v3: {
        '3-parameters.yaml': [
            {
                method: 'POST',
                url: '/pets/cats',
                // request contains an additional property, but the OpenAPI document
                // explicitly allows it, so it should pass
                data: JSON.stringify({
                    search: 'Is anybody in there?',
                    strict: false,
                    watson: 'Sherlock!',
                }),
            },
        ],
    },
};
exports.INVALID_TEST_REQUESTS = {
    v3: {
        '2-path.yaml': [
            {
                method: 'POST',
                url: '/echo',
                data: JSON.stringify({ blurp: 'BLUUURP!' }),
                expectedError: { keyword: 'required' },
            },
        ],
        '3-parameters.yaml': [
            {
                method: 'POST',
                url: '/pets/cat?limit=nonsense',
                data: JSON.stringify({ search: 'Garfield' }),
                expectedError: { keyword: 'type' },
            },
            {
                method: 'POST',
                url: '/pets/cat',
                data: '{}',
                expectedError: { keyword: 'required' },
            },
        ],
        '6-examples.yaml': [
            { method: 'GET', url: '/pets/cat', expectedError: { keyword: 'type' } },
        ],
    },
};
exports.STRICTLY_INVALID_TEST_REQUESTS = {
    v3: {
        '2-path.yaml': [
            {
                method: 'POST',
                url: '/echo',
                data: JSON.stringify({ input: 'Marco!', sponge: 'Bob' }),
                expectedError: { keyword: 'additionalProperties' },
            },
        ],
        '3-parameters.yaml': [
            {
                method: 'POST',
                url: '/pets/cat?limit=3&test=false',
                data: JSON.stringify({ search: 'Dark Side of the Moon' }),
                expectedError: { keyword: 'additionalProperties' },
            },
        ],
    },
};
//# sourceMappingURL=test-requests.js.map