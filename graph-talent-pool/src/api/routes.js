const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const handlers = require('./handlers');

/**
 * Route dispatcher
 */
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API Routes
    if (pathname === '/api/candidates') {
        return handlers.getCandidates({ query: parsedUrl.query }, res);
    }

    if (pathname === '/api/candidate') {
        return handlers.getCandidateProfile({ query: parsedUrl.query }, res);
    }

    if (pathname === '/api/overlap') {
        return handlers.getCandidatesOverlap({ query: parsedUrl.query }, res);
    }

    if (pathname === '/api/project') {
        return handlers.getProjectDetails({ query: parsedUrl.query }, res);
    }

    if (pathname === '/api/roles') {
        return handlers.getRoleDefinitions(req, res);
    }

    // Static files
    if (pathname.startsWith('/js/') || pathname.startsWith('/css/')) {
        return serveStaticFile(pathname, res);
    }

    // Default: serve index.html
    return serveIndex(res);
}

/**
 * Serve static files
 */
async function serveStaticFile(pathname, res) {
    try {
        const filePath = path.join(__dirname, '../../public', pathname);
        const ext = path.extname(pathname);
        const contentType = getContentType(ext);

        const content = await fs.readFile(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

/**
 * Serve main index HTML
 */
async function serveIndex(res) {
    try {
        const indexPath = path.join(__dirname, '../../public/index.html');
        const html = await fs.readFile(indexPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

/**
 * Get content type based on file extension
 */
function getContentType(ext) {
    const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
    };
    return types[ext] || 'text/plain';
}

module.exports = {
    handleRequest
};
