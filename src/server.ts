import 'dotenv/config'
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})

process.on('unhandledRejection', (err: Error) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
})