import db from './db.js';
import { spinner } from './spinner.js';
import os from 'os';
import config from './config.js';
import api from './api.js';
import formData from 'express-form-data';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const options = {
    uploadDir: os.tmpdir(),
    autoClean: true,
};

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(formData.parse(options));
app.use(formData.format());
app.use(formData.union());

async function init() {
    spinner.text = 'Loading stores';
    spinner.start();
    db.init(() => spinner.stop());
}

app.use(express.static('client/dist'));
app.use('/api', api);

app.listen(config.PORT, async () => {
    console.log(`API Server Viz listening on port ${config.PORT}\n`);
    init();
});
