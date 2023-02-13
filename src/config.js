import { config } from 'dotenv';
// Load defaults from .env
config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const STORE_PATH = process.env.STORE_PATH || './store';

export default {
    PORT,
    STORE_PATH,
};
