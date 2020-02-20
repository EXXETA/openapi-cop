export class ResponseParsingError extends Error {
  constructor(public message: string) {
    super(message);
  }
}

export class SchemaValidationException extends Error {
  constructor(public message: string) {
    super(message);
  }
}

export class SchemaDereferencingException extends Error {
  constructor(public message: string) {
    super(message);
  }
}
