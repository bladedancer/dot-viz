import express from 'express';
import db from './db.js';
import { log, highlight, note } from './log.js';
import StreamZip from 'node-stream-zip';

let api = express.Router();

api.post('/fed', async (req, res) => {
    try {
        await db.store(req.files.fed.name, req.files.fed.path);
        res.json({ fed: req.files.fed.name });
    } catch (err) {
        log.error(err);
        return res
            .status(400)
            .append('Content-Type', 'application/json')
            .send({ error: err });
    }
});

api.get('/definitions', async (req, res) => {
    //    res.json(db.definitions());
});

api.get('/definitions/refresh', async (req, res, next) => {
    try {
        //        await db.refresh('definitions');
        //        res.json(db.definitions());
    } catch (e) {
        log.error(e);
        next(e);
    }
});

api.get('/instances', async (req, res) => {
    //    res.json(db.instances());
});

api.get('/instances/refresh', async (req, res, next) => {
    try {
        // await db.refresh('instances');
        // res.json(db.instances());
    } catch (e) {
        log.error(e);
        next(e);
    }
});

api.get('/loading', async (req, res, next) => {
    //    res.json(db.loading());
});

api.get('/wait', async (req, res) => {
    try {
        // await db.init();
        res.end();
    } catch (e) {
        log.error(e);
        next(e);
    }
});

export default api;
