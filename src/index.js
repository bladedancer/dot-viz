import config from './config.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { log } from './log.js';
import { generateDot } from './generate.js';

const app = express();
app.use(cors());
app.use(express.static('client/dist'));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 },
});

app.post('/api/generate', upload.single('pom'), async (req, res) => {
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
        const message = err.code === 'ENOENT'
            ? 'mvn not found — ensure Maven is installed and on PATH'
            : (err.stderr || err.message || String(err));
        log.error('generate failed', message);
        res.status(500).json({ error: message });
    }
});

app.listen(config.PORT, async () => {
    log.info(`Dot Viz listening on port ${config.PORT}`);
});
