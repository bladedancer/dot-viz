import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

function buildMvnArgs(pomFilePath, includes) {
    const args = [
        'com.github.ferstl:depgraph-maven-plugin:aggregate',
        '-DshowGroupIds',
        '-DshowConflicts',
        '-DgraphFormat=dot',
        '-f', pomFilePath,
    ];
    if (includes && includes.trim()) {
        args.push(`-Dincludes=${includes.trim()}`);
    }
    return args;
}

async function runMvn(args, cwd) {
    try {
        await execFileAsync('mvn', args, { cwd, timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
        if (err.code === 'ENOENT') {
            const friendly = new Error('mvn not found — ensure Maven is installed and on PATH');
            friendly.isMvnMissing = true;
            throw friendly;
        }
        throw err;
    }
}

export async function generateDot(pomContent, includes) {
    const dir = await mkdtemp(join(tmpdir(), 'dot-viz-'));
    try {
        const pomFilePath = join(dir, 'pom.xml');
        await writeFile(pomFilePath, pomContent, 'utf8');
        await runMvn(buildMvnArgs(pomFilePath, includes), dir);
        const dotPath = join(dir, 'target', 'dependency-graph.dot');
        return await readFile(dotPath, 'utf8');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

export async function generateDotFromPath(pomPath, includes) {
    const dir = dirname(pomPath);
    await runMvn(buildMvnArgs(pomPath, includes), dir);
    const dotPath = join(dir, 'target', 'dependency-graph.dot');
    return await readFile(dotPath, 'utf8');
}
