export class BaseFormat {
  constructor(spec: any);
  spec: any;
  format: any;
  converters: any;
  convertTo(format: any, callback: any): any;
  convertTransitive(intermediaries: any): any;
  fixSpec(): void;
  listSubResources(): any;
  parse(data: any): any;
  readSpec(source: any): any;
  resolveResources(source: any): any;
  resolveSubResources(): any;
  stringify(options: any): any;
  validate(callback: any): any;
}
export namespace Formats {
  class api_blueprint {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class google {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class io_docs {
    constructor(...args: any[]);
    type: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class openapi_3 {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fillMissing(dummyData: any): void;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class raml {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class swagger_1 {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class swagger_2 {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fillMissing(dummyData: any): void;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
  class wadl {
    constructor(...args: any[]);
    format: any;
    checkFormat(spec: any): any;
    convertTo(format: any, callback: any): any;
    convertTransitive(intermediaries: any): any;
    fixSpec(): void;
    getFormatVersion(): any;
    listSubResources(): any;
    parse(data: any): any;
    readSpec(source: any): any;
    resolveResources(source: any): any;
    resolveSubResources(): any;
    stringify(options: any): any;
    validate(callback: any): any;
  }
}
export namespace ResourceReaders {
  function file(filename: any): any;
  function object(data: any): any;
  function string(data: any): any;
  function url(url: any, callback: any): any;
}
export function convert(options: any, callback: any): any;
export function convert(options: any): Promise<any>;
export function getFormatName(name: any, version: any): any;
export function getSpec(source: any, format: any, callback: any): any;
