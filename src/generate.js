import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

export async function generateDot(pomContent, includes) {
    const dir = join(tmpdir(), `dot-viz-${Date.now()}`);
    try {
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'pom.xml'), pomContent);

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

        await execFileAsync('mvn', args, { cwd: dir, timeout: 120000 });

        const dotPath = join(dir, 'target', 'dependency-graph.dot');
        return await readFile(dotPath, 'utf8');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
