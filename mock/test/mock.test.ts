import axios, {AxiosInstance} from 'axios';
import {ChildProcess, exec, spawn} from 'child_process';
import * as path from 'path';
import * as waitOn from 'wait-on';
import * as which from 'which';

export const SCHEMAS_DIR = path.resolve(__dirname, '../../schemas/');
export const PORT = 8889;
export const DEFAULT_OPENAPI_FILE =
    path.join(SCHEMAS_DIR, 'v3/6-examples.yaml');

jest.setTimeout(15000);

const npm = which.sync('npm');

describe('mock API tests', () => {
  let client: AxiosInstance;
  let start: ChildProcess;

  beforeAll(async () => {
    client = axios.create({
      baseURL: 'http://localhost:8889',
      headers: {'content-type': 'application/json'},
      validateStatus: () => true
    });

    start = spawn(
        npm,
        [
          'start', '--', '--port', PORT.toString(), '--file',
          DEFAULT_OPENAPI_FILE, '--verbose'
        ],
        {cwd: __dirname, detached: false, stdio: 'inherit'});

    await waitOn({resources: [`tcp:localhost:${PORT}`]});
  });

  afterAll(done => {
    const isWin = /^win/.test(process.platform);
    if (!isWin) {
      process.kill(-start.pid);
    } else {
      exec('taskkill /PID ' + start.pid + ' /T /F').on('close', () => {
        done();
      });
    }
  });

  test('GET /pets returns 200 with mocked result', async () => {
    const res = await client.get('/pets');
    expect(res.status).toBe(200);
    expect(res.data).toEqual([{id: 1, name: 'Odie'}]);
  });

  test('GET /pets/1 returns 200 with mocked result', async () => {
    const res = await client.get('/pets/1');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({id: 1, name: 'Garfield'});
  });

  test('POST /pets returns 201 with mocked result', async () => {
    const res = await client.post('/pets', {});
    expect(res.status).toBe(201);
    expect(res.data).toEqual({id: 1, name: 'Garfield'});
  });

  test('GET /unknown returns 404', async () => {
    const res = await client.get('/unknown');
    expect(res.status).toBe(404);
    expect(res.data).toHaveProperty('error');
  });
});
