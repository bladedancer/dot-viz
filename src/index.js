import config from './config.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { log } from './log.js';
import { generateDot, generateDotFromPath, filterDotByGroup } from './generate.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('client/dist'));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 },
});

// Legacy file-upload endpoint
app.post('/api/generate', (req, res, next) => {
    upload.single('pom')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || String(err) });
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No pom.xml uploaded' });
    }
    const includes = Array.isArray(req.body.includes)
        ? req.body.includes.join(',')
        : (req.body.includes || '');
    try {
        const dot = await generateDot(req.file.buffer.toString('utf8'), includes);
        res.type('text/plain').send(dot);
    } catch (err) {
        const message = err.stderr || err.message || String(err);
        log.error('generate failed', message);
        res.status(500).json({ error: message });
    }
});

// Path-based load: reads an already-generated dependency-graph.dot
app.post('/api/load-path', async (req, res) => {
    const { pomPath, groupFilter } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    const dotPath = join(dirname(pomPath), 'target', 'dependency-graph.dot');
    try {
        const dot = await readFile(dotPath, 'utf8');
        res.type('text/plain').send(filterDotByGroup(dot, groupFilter || ''));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(500).json({ error: `Could not read ${dotPath}: ${err.message}` });
        }
        log.error('load-path failed', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Path-based generate: runs mvn in the pom's directory
app.post('/api/generate-path', async (req, res) => {
    const { pomPath, groupFilter } = req.body || {};
    if (!pomPath) return res.status(400).json({ error: 'pomPath is required' });
    try {
        const dot = await generateDotFromPath(pomPath, groupFilter || '');
        res.type('text/plain').send(dot);
    } catch (err) {
        const message = err.stderr || err.message || String(err);
        log.error('generate-path failed', message);
        res.status(500).json({ error: message });
    }
});

app.listen(config.PORT, async () => {
    log.info(`Dot Viz listening on port ${config.PORT}`);
});
