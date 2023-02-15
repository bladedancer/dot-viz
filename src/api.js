import express from 'express';
import db from './db.js';
import { log, highlight, note } from './log.js';
import process from './fedprocessor.js';

let api = express.Router();

api.get('/feds', async (req, res) => {
    try {
        res.json(Object.keys(db.feds()));
    } catch (err) {
        log.error(err);
        return res
            .status(400)
            .append('Content-Type', 'application/json')
            .send({ error: err });
    }
});

api.post('/feds', async (req, res) => {
    try {
        const enitiyStores = await process(req.files.fed.name, req.files.fed.path);
        await db.store(req.files.fed.name, enitiyStores);
        res.json(enitiyStores);
    } catch (err) {
        log.error(err);
        return res
            .status(400)
            .append('Content-Type', 'application/json')
            .send({ error: err });
    }
});

api.get('/feds/:name', async (req, res) => {
    const fed = db.feds()[req.params.name];
    if (!fed) {
        res
        .status(404)
        .append('Content-Type', 'application/json')
        .send({ error: `${req.params.name} not found` });
    } else {
        res.json(fed);
    }
});


api.get('/loading', async (req, res, next) => {
    res.json(db.loading());
});

api.get('/wait', async (req, res) => {
    try {
        await db.init();
        res.end();
    } catch (e) {
        log.error(e);
        next(e);
    }
});

export default api;
