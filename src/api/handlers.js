const queries = require('../database/queries');

/**
 * GET /api/candidates
 * Get filtered list of candidates
 */
async function getCandidates(req, res) {
    try {
        const data = await queries.getCandidates(req.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('GET /api/candidates ERROR:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

/**
 * GET /api/candidate?id=xxx
 * Get detailed candidate profile
 */
async function getCandidateProfile(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            throw new Error('Candidate ID is required');
        }
        const data = await queries.getCandidateProfile(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('GET /api/candidate ERROR:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

/**
 * GET /api/overlap?ids=xxx,yyy
 * Get overlap analysis between candidates
 */
async function getCandidatesOverlap(req, res) {
    try {
        const { ids } = req.query;
        if (!ids) {
            throw new Error('Candidate IDs are required');
        }
        const idArray = ids.split(',').filter(Boolean);
        if (idArray.length < 2) {
            throw new Error('At least 2 candidates are required for comparison');
        }
        const data = await queries.getCandidatesOverlap(idArray);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('GET /api/overlap ERROR:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

/**
 * GET /api/project?id=xxx
 * Get project details with team
 */
async function getProjectDetails(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            throw new Error('Project ID is required');
        }
        const data = await queries.getProjectDetails(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('GET /api/project ERROR:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

/**
 * GET /api/roles
 * Get role definitions
 */
function getRoleDefinitions(req, res) {
    const ROLE_DEFINITIONS = require('../config/roles');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ROLE_DEFINITIONS));
}

module.exports = {
    getCandidates,
    getCandidateProfile,
    getCandidatesOverlap,
    getProjectDetails,
    getRoleDefinitions
};
