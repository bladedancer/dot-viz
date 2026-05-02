import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { log } from './log.js';

const execFileAsync = promisify(execFile);

export async function generateDot(pomContent, includes) {
    const dir = await mkdtemp(join(tmpdir(), 'dot-viz-'));
    try {
        await writeFile(join(dir, 'pom.xml'), pomContent, 'utf8');

        const args = [
            'com.github.ferstl:depgraph-maven-plugin:aggregate',
            '-DshowGroupIds',
            '-DshowConflicts',
            '-DgraphFormat=dot',
            '-f', join(dir, 'pom.xml'),
        ];
        if (includes && includes.trim()) {
            args.push(`-Dincludes=${includes.trim()}`);
        }

        try {
            await execFileAsync('mvn', args, { cwd: dir, timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
        } catch (err) {
            if (err.code === 'ENOENT') {
                const friendly = new Error('mvn not found — ensure Maven is installed and on PATH');
                friendly.isMvnMissing = true;
                throw friendly;
            }
            log.error('mvn execution failed', err.message || String(err));
            throw err;
        }

        const dotPath = join(dir, 'target', 'dependency-graph.dot');
        return await readFile(dotPath, 'utf8');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
