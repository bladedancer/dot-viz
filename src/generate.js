import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

export function filterDotByGroup(dotText, groupFilter) {
    const prefixes = (groupFilter || '')
        .split(',')
        .map((s) => s.trim().replace(/\*+$/, ''))
        .filter(Boolean);
    if (!prefixes.length) return dotText;

    const lines = dotText.split('\n');
    // Collect node IDs whose group matches at least one prefix
    const allowed = new Set();
    for (const line of lines) {
        // Node lines look like:  "group:artifact" [label=...];
        const nodeMatch = line.match(/^\s*"([^"]+)"\s*\[/);
        if (nodeMatch) {
            const id = nodeMatch[1];
            const group = id.split(':')[0];
            if (prefixes.some((p) => group.startsWith(p))) {
                allowed.add(id);
            }
        }
    }

    // Emit header, allowed nodes, allowed edges, closing brace
    const result = [];
    for (const line of lines) {
        const nodeMatch = line.match(/^\s*"([^"]+)"\s*\[/);
        if (nodeMatch) {
            if (allowed.has(nodeMatch[1])) result.push(line);
            continue;
        }
        // Edge lines look like:  "group:artifact" -> "group:artifact" ...
        const edgeMatch = line.match(/^\s*"([^"]+)"\s*->\s*"([^"]+)"/);
        if (edgeMatch) {
            if (allowed.has(edgeMatch[1]) && allowed.has(edgeMatch[2])) result.push(line);
            continue;
        }
        result.push(line);
    }
    return result.join('\n');
}

function buildMvnArgs(pomFilePath, groupFilter) {
    const args = [
        'com.github.ferstl:depgraph-maven-plugin:aggregate',
        '-DshowGroupIds',
        '-DshowConflicts',
        '-DgraphFormat=dot',
        '-f', pomFilePath,
    ];
    if (groupFilter && groupFilter.trim()) {
        args.push(`-Dincludes=${groupFilter.trim()}`);
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

export async function generateDot(pomContent, groupFilter) {
    const dir = await mkdtemp(join(tmpdir(), 'dot-viz-'));
    try {
        const pomFilePath = join(dir, 'pom.xml');
        await writeFile(pomFilePath, pomContent, 'utf8');
        await runMvn(buildMvnArgs(pomFilePath, groupFilter), dir);
        const dotPath = join(dir, 'target', 'dependency-graph.dot');
        const dot = await readFile(dotPath, 'utf8');
        return filterDotByGroup(dot, groupFilter);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

export async function generateDotFromPath(pomPath, groupFilter) {
    const dir = dirname(pomPath);
    await runMvn(buildMvnArgs(pomPath, groupFilter), dir);
    const dotPath = join(dir, 'target', 'dependency-graph.dot');
    const dot = await readFile(dotPath, 'utf8');
    return filterDotByGroup(dot, groupFilter);
}
