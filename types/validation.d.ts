import { ValidationResult } from 'openapi-backend';

export interface ValidationResults {
  request?: ValidationResult;
  response?: ValidationResult;
  responseHeaders?: ValidationResult;
}