// Role definitions and criteria
const ROLE_DEFINITIONS = {
    specialists: {
        'Data Scientist': {
            minYears: 2,
            requiredSkills: ['Python', 'Machine Learning', 'Pandas', 'NumPy'], // Removed Scikit-learn to match data
            description: 'Advanced analytics and ML modeling'
        },
        'Data Analyst': {
            minYears: 2,
            requiredSkills: ['Data Analysis', 'Tableau', 'Power BI'], // Aligned with generated skills
            description: 'Data interpretation and visualization'
        },
        'Software Engineer': {
            minYears: 2,
            requiredSkills: ['JavaScript', 'Node.js', 'React'],
            description: 'Full-stack application development'
        },
        'Software Architect': {
            minYears: 10,
            requiredSkills: ['System Design', 'Microservices', 'Cloud Native'],
            description: 'High-level system design and standards'
        },
        'Accounting Specialist': {
            minYears: 5,
            requiredSkills: ['Accounting Principles', 'Financial Reporting', 'Taxation'],
            description: 'Financial management and reporting'
        },
        'Marketing Specialist': {
            minYears: 5,
            requiredSkills: ['Digital Marketing', 'Brand Strategy', 'Analytics'],
            description: 'Market research and promotion'
        },
        'Product Specialist': {
            minYears: 5,
            requiredSkills: ['Product Lifecycle', 'User Research', 'Agile'],
            description: 'Product management and strategy'
        },
        'Research Specialist': {
            minYears: 5,
            requiredSkills: ['Data Analysis', 'Statistics', 'Methodology'],
            description: 'Academic and market research'
        }
    },
    structural: {
        'Unit Head': {
            minYears: 5,
            requiredSkills: ['Leadership', 'Team Management'],
            description: 'Team leadership and delivery'
        },
        'Department Head': { // Matches "Dept Head" generated data
            minYears: 10,
            requiredSkills: ['Operations Management', 'Resource Planning', 'Team Management'],
            description: 'Departmental strategy and operations'
        },
        'Division Head': {
            minYears: 15,
            requiredSkills: ['Strategic Planning', 'Executive Management', 'Business Strategy'],
            description: 'Organizational leadership'
        }
    },
    tech_field: {
        'CTO': {
            minYears: 15,
            requiredSkills: ['Tech Strategy', 'Innovation', 'System Design'], // Aligned with generated data
            description: 'Chief Technology Officer'
        },
        'CIO': {
            minYears: 15,
            requiredSkills: ['IT Strategy', 'Digital Transformation', 'Enterprise Architecture'], // Aligned
            description: 'Chief Information Officer'
        },
        'IT Gov.': {
            minYears: 8,
            requiredSkills: ['IT Governance', 'Risk Management', 'Compliance'],
            description: 'IT Governance, Risk and Compliance'
        },
        'SME': {
            minYears: 12,
            requiredSkills: ['System Design', 'Problem Solving'],
            description: 'Subject Matter Expert'
        }
    }
};

module.exports = ROLE_DEFINITIONS;
