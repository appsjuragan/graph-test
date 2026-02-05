const { executeQuery } = require('./connection');

/**
 * Get filtered candidates based on search criteria
 */
async function getCandidates(filters) {
    const {
        category = 'specialists',
        role = '',
        requiredSkills = '',
        minYears = 0,
        minConnections = 0
    } = filters;

    const skillsList = requiredSkills ? requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];

    let skillClause = '';
    if (skillsList.length > 0) {
        skillClause = `AND ALL(skill IN $skills WHERE EXISTS((p)-[:HAS_SKILL]->(:Skill {name: skill})))`;
    }

    const query = `
        MATCH (p:Person)
        WHERE p.working_years >= $minYears
        ${skillClause}
        OPTIONAL MATCH (p)-[:FOLLOWS]->()
        WITH p, count(*) as conn
        WHERE conn >= $minConnections
        OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
        WITH p, conn, collect(s.name) as skills
        RETURN p.id as id, p.name as name, p.email as email, 
               p.working_years as workingYears, conn as connections,
               skills, size(skills) as skillCount
        ORDER BY skillCount DESC, conn DESC
        LIMIT 100
    `;

    const result = await executeQuery(query, {
        minYears: parseInt(minYears) || 0,
        minConnections: parseInt(minConnections) || 0,
        skills: skillsList
    });

    const candidates = result.records.map(r => {
        const workingYears = r.get('workingYears');
        return {
            id: r.get('id'),
            name: r.get('name'),
            email: r.get('email'),
            workingYears: workingYears?.low || workingYears || 0,
            connections: r.get('connections')?.low || r.get('connections') || 0,
            dataSkills: r.get('skills') || [],
            fitScore: Math.min(100, (r.get('skillCount')?.low || 0) * 5 + 50)
        };
    });

    // Calculate Skill Distribution
    const allSkills = candidates.flatMap(c => c.dataSkills);
    const skillCounts = {};
    allSkills.forEach(s => skillCounts[s] = (skillCounts[s] || 0) + 1);
    const skillDistribution = Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Calculate Years Distribution
    const yearsCounts = { '0-4': 0, '5-9': 0, '10-14': 0, '15-19': 0, '20+': 0 };
    candidates.forEach(c => {
        const wy = c.workingYears;
        if (wy < 5) yearsCounts['0-4']++;
        else if (wy < 10) yearsCounts['5-9']++;
        else if (wy < 15) yearsCounts['10-14']++;
        else if (wy < 20) yearsCounts['15-19']++;
        else yearsCounts['20+']++;
    });
    const yearsDistribution = Object.entries(yearsCounts).map(([range, count]) => ({ range, count }));

    return { candidates, skillDistribution, yearsDistribution };
}

/**
 * Get detailed profile for a candidate
 */
async function getCandidateProfile(id) {
    const query = `
        MATCH (p:Person {id: $id})
        OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
        OPTIONAL MATCH (p)-[:WORKED_AT]->(e:Experience)
        OPTIONAL MATCH (p)-[:WORKS_ON]->(proj:Project)
        OPTIONAL MATCH (p)-[:FOLLOWS]->(c:Person)
        RETURN 
            p,
            collect(DISTINCT s) as skills,
            collect(DISTINCT e) as experiences,
            collect(DISTINCT proj) as projects,
            collect(DISTINCT c) as connections
    `;

    const result = await executeQuery(query, { id });

    if (result.records.length === 0) {
        throw new Error('Candidate not found');
    }

    const record = result.records[0];
    const p = record.get('p').properties;

    return {
        person: {
            id: p.id,
            name: p.name,
            email: p.email,
            working_years: p.working_years?.low || p.working_years || 0
        },
        skills: record.get('skills')
            .map(s => s.properties)
            .sort((a, b) => a.name.localeCompare(b.name)),
        experiences: record.get('experiences')
            .map(e => ({
                id: e.properties.id,
                company: e.properties.company,
                role: e.properties.role,
                start_date: e.properties.start_date.toString(),
                end_date: e.properties.end_date ? e.properties.end_date.toString() : null,
                description: e.properties.description
            }))
            .sort((a, b) => b.start_date.localeCompare(a.start_date)),
        projects: record.get('projects').map(p => p.properties),
        connections: record.get('connections')
            .map(c => ({
                id: c.properties.id,
                name: c.properties.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    };
}

/**
 * Get overlap analysis between multiple candidates
 */
async function getCandidatesOverlap(ids) {
    const query = `
        MATCH (p:Person)
        WHERE p.id IN $ids
        WITH collect(p) as people
        
        // Shared skills
        MATCH (s:Skill)
        WHERE ALL(person IN people WHERE (person)-[:HAS_SKILL]->(s))
        WITH people, collect(DISTINCT s.name) as shared_skills
        
        // Shared connections
        OPTIONAL MATCH (c:Person)
        WHERE ALL(person IN people WHERE (person)-[:FOLLOWS]->(c) OR (person)<-[:FOLLOWS]-(c))
        WITH people, shared_skills, collect(DISTINCT c.name) as shared_connections
        
        // Shared companies
        OPTIONAL MATCH (org:Company)
        WHERE ALL(person IN people WHERE (person)-[:WORKED_AT]->(org))
        WITH people, shared_skills, shared_connections, collect(DISTINCT org.name) as shared_companies
        
        // Shared projects
        OPTIONAL MATCH (proj:Project)
        WHERE ALL(person IN people WHERE (person)-[:WORKS_ON]->(proj))
        WITH people, shared_skills, shared_connections, shared_companies, 
             collect(DISTINCT {id: proj.id, name: proj.name, type: proj.type, scale: proj.scale}) as shared_projects
        
        RETURN people, shared_skills, shared_connections, shared_companies, shared_projects
    `;

    const result = await executeQuery(query, { ids });

    if (result.records.length === 0) {
        throw new Error('No data found');
    }

    const record = result.records[0];
    const people = record.get('people').map(p => ({
        id: p.properties.id,
        name: p.properties.name,
        email: p.properties.email
    }));

    const sharedProjects = record.get('shared_projects');
    const sharedSkills = record.get('shared_skills');
    const sharedConnections = record.get('shared_connections');

    // Calculate collaboration score
    const collaborationScore =
        (sharedProjects.length * 10) +
        (sharedSkills.length * 2) +
        (sharedConnections.length * 5);

    return {
        candidates: people,
        sharedSkills,
        sharedConnections,
        sharedCompanies: record.get('shared_companies'),
        sharedProjects,
        collaborationScore
    };
}

/**
 * Get project details with team members
 */
async function getProjectDetails(id) {
    const query = `
        MATCH (proj:Project {id: $id})
        OPTIONAL MATCH (p:Person)-[r:WORKS_ON]->(proj)
        WITH proj, p, r
        ORDER BY 
            CASE 
                WHEN r.role CONTAINS 'Sponsor' OR r.role CONTAINS 'Director' THEN 1
                WHEN r.role CONTAINS 'Manager' OR r.role CONTAINS 'Lead' THEN 2
                WHEN r.role CONTAINS 'Architect' THEN 3
                WHEN r.role CONTAINS 'Senior' THEN 4
                ELSE 5
            END,
            p.name
        RETURN 
            proj,
            collect({
                id: p.id,
                name: p.name,
                projectRole: r.role,
                contribution: r.contribution,
                joinedDate: r.joined_date
            }) as team
    `;

    const result = await executeQuery(query, { id });

    if (result.records.length === 0) {
        throw new Error('Project not found');
    }

    const record = result.records[0];
    const proj = record.get('proj').properties;

    return {
        project: {
            id: proj.id,
            name: proj.name,
            type: proj.type,
            scale: proj.scale,
            status: proj.status,
            teamSize: proj.team_size?.low || proj.team_size
        },
        team: record.get('team')
            .filter(t => t.id)
            .map(t => ({
                id: t.id,
                name: t.name,
                projectRole: t.projectRole || 'Team Member',
                contribution: t.contribution || 'Active',
                joinedDate: t.joinedDate || '2024-01-01'
            }))
    };
}

module.exports = {
    getCandidates,
    getCandidateProfile,
    getCandidatesOverlap,
    getProjectDetails
};
