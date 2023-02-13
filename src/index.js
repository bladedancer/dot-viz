//import db from './db.js';
// import { spinner } from './spinner.js';
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

// parse data with connect-multiparty.
app.use(formData.parse(options));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream
//app.use(formData.stream());
// union the body and the files
app.use(formData.union());

async function init() {
    // spinner.text = 'Loading schema';
    // spinner.start();
    // db.init(() => spinner.stop());
}

app.use(express.static('client/dist'));
app.use('/api', api);

app.listen(config.PORT, async () => {
    console.log(`API Server Viz listening on port ${config.PORT}\n`);
    init();
});
