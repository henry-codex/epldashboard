require("dotenv").config({ path: "./apps/server/.env" });

const http = require("http");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

const requestHandler = async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Database connected successfully!\nPostgreSQL version: ${version}`);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Database connection failed: ${error.message}`);
  }
};

http.createServer(requestHandler).listen(3333, () => {
  console.log("Database test server running at http://localhost:3333");
  console.log("Visit the URL to test your Neon database connection");
});