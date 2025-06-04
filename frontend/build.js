import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import chokidar from 'chokidar';
import dotenvFlow from 'dotenv-flow';
import debounce from 'lodash.debounce';
import minimist from 'minimist';


// Emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const args = minimist(process.argv.slice(2), {
    string: ['apiUrl'],
    boolean: ['watch'],
    alias: { api: 'a', watch: 'w' }
});

const env = process.env.NODE_ENV || "development";
dotenvFlow.config({ node_env: env });

const publicDir = path.join(__dirname, "public");
const distDir = path.join(__dirname, "dist");

// CLI arg takes priority over env.
const apiUrl = args.apiUrl || process.env.API_URL;
const isWatching = !!args.watch;


// Validate the required config.
if (!apiUrl) {
    console.error("❌ ERROR: Missing required API_URL.");
    console.error("💡 Set it via an environment variable or a CLI arg.");
    console.error("   Example: API_URL=https://api.example.com node build.js");
    process.exit(1);
}


function build() {
    // Ensure the dist directory is clean and ready.
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });

    // Read the template HTML file, replace the API_URL placeholder, and write to dist.
    const template = fs.readFileSync(path.join(publicDir, "index.template.html"), "utf8");
    const output = template.replace(/__API_URL__/g, apiUrl);
    fs.writeFileSync(path.join(distDir, "index.html"), output);

    // Copy all other static files from public to dist, excluding the template file.
    fs.readdirSync(publicDir).forEach((item) => {
        const srcPath = path.join(publicDir, item);
        const destPath = path.join(distDir, item);

        // Skip the template.
        if (item === "index.template.html") return;

        copyRecursive(srcPath, destPath);
    });

    console.log(`✅ Build complete → API_URL=${apiUrl}`);
}

function copyRecursive(src, dest) {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const item of fs.readdirSync(src)) {
            copyRecursive(path.join(src, item), path.join(dest, item));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

build();


// If the --watch flag is provided, set up a file watcher on the public directory.
if (process.argv.includes("--watch")) {
    console.log("👀 Watching for changes...");
    chokidar.watch(publicDir, {
        ignored: /(^|[\/\\])dist/,
        ignoreInitial: true
    }).on("all", (_, changedPath) => {
        console.log(`🔁 File changed: ${changedPath}`);
        debounce(() => build(), 500)();
    });
}
