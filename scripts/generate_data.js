const { fakerID_ID: faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

// Configuration
const NUM_RANDOM_PEOPLE = 400;

// Common Indonesian Surnames/Family Names
const INDO_SURNAMES = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Hidayat', 'Sari', 'Utami',
  'Lestari', 'Wulandari', 'Siregar', 'Nasution', 'Batubara', 'Ginting', 'Sembiring',
  'Gunawan', 'Setiawan', 'Budiman', 'Herianto', 'Susanto', 'Purnomo', 'Wibowo',
  'Nugroho', 'Prasetyo', 'Hartono', 'Sasmita', 'Dharmawan', 'Fauzi', 'Hamid', 'Lubis'
];

// Specific Roles and their related skills
const TARGET_ROLES = [
  { title: 'Division Head', minExp: 18, skills: ['Leadership', 'Strategic Planning', 'Executive Management', 'Business Strategy', 'Budgeting'] },
  { title: 'Dept Head', minExp: 12, skills: ['Team Management', 'Operations Management', 'Resource Planning', 'Performance Metrics'] },
  { title: 'IT Gov.', minExp: 10, skills: ['IT Governance', 'COBIT', 'ITIL', 'Risk Management', 'Compliance', 'ISO 27001'] },
  { title: 'CIO', minExp: 20, skills: ['Digital Transformation', 'IT Strategy', 'Leadership', 'Stakeholder Management', 'Enterprise Architecture'] },
  { title: 'CTO', minExp: 20, skills: ['System Design', 'Tech Strategy', 'Innovation', 'Scalability', 'Cloud Architecture', 'Leadership'] },
  { title: 'Accounting Specialist', minExp: 8, skills: ['Financial Reporting', 'Audit', 'Taxation', 'SAP', 'Accounting Principles', 'Budgeting'] },
  { title: 'Marketing Specialist', minExp: 8, skills: ['Digital Marketing', 'Brand Strategy', 'Market Research', 'SEO', 'Content Strategy', 'Analytics'] },
  { title: 'Product Specialist', minExp: 8, skills: ['Product Lifecycle', 'User Research', 'Agile', 'Market Analysis', 'Roadmapping', 'Scrum'] },
  { title: 'Research Specialist', minExp: 8, skills: ['Data Analysis', 'Statistics', 'R', 'Python', 'Methodology', 'Technical Writing'] },
  { title: 'Software Architect', minExp: 12, skills: ['Microservices', 'Clean Architecture', 'System Design', 'Scalability', 'Cloud Native', 'Java'] }
];

// Data pools for realistic generation
const DEGREES = ['Bachelor', 'Master', 'PhD', 'Associate', 'Diploma', 'Certificate'];
const FIELDS = [
  'Computer Science', 'Information Technology', 'Business Administration',
  'Engineering', 'Data Science', 'Cybersecurity', 'Digital Marketing',
  'Human Resources', 'Finance', 'Accounting', 'Psychology', 'Communications',
  'Graphic Design', 'Project Management', 'Economics', 'Mathematics'
];
const INSTITUTIONS = [
  'MIT', 'Stanford University', 'Harvard University', 'UC Berkeley',
  'University of Indonesia', 'Bandung Institute of Technology', 'Gadjah Mada University',
  'National University of Singapore', 'Oxford University', 'Cambridge University',
  'University of Melbourne', 'University of Tokyo', 'Seoul National University'
];

const CERTIFICATE_NAMES = [
  'AWS Solutions Architect', 'Google Cloud Professional', 'Azure Administrator',
  'PMP - Project Management Professional', 'Scrum Master Certified', 'CISSP',
  'CompTIA Security+', 'Cisco CCNA', 'Kubernetes Administrator', 'Docker Certified',
  'Salesforce Administrator', 'HubSpot Marketing', 'Google Analytics',
  'Six Sigma Green Belt', 'ITIL Foundation', 'Tableau Desktop Specialist',
  'Python Professional', 'Java SE Programmer', 'Microsoft 365 Certified',
  'Certified Ethical Hacker', 'Data Science Professional', 'Machine Learning Engineer'
];

const COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Spotify',
  'Gojek', 'Tokopedia', 'Shopee', 'Grab', 'Traveloka', 'Bukalapak',
  'Accenture', 'Deloitte', 'McKinsey', 'BCG', 'PwC', 'KPMG', 'EY',
  'Bank Mandiri', 'BCA', 'BRI', 'Telkom Indonesia', 'Pertamina',
  'Unilever', 'P&G', 'Nestle', 'Samsung', 'LG', 'Huawei', 'Xiaomi'
];

const JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Lead Developer',
  'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Data Scientist', 'Data Analyst', 'Business Analyst', 'Product Manager',
  'Project Manager', 'UX Designer', 'UI Designer', 'DevOps Engineer',
  'Cloud Architect', 'Security Engineer', 'QA Engineer', 'Tech Lead',
  'Engineering Manager', 'CTO', 'VP Engineering', 'HR Manager',
  'Marketing Manager', 'Sales Executive', 'Account Manager',
  'Financial Analyst', 'Operations Manager', 'Consultant', 'Intern'
];

const ALL_SKILLS = [
  'JavaScript', 'Python', 'Java', 'C++', 'C#', 'TypeScript', 'Go', 'Rust', 'PHP', 'Ruby',
  'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask', 'Spring Boot', 'Next.js',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Neo4j', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux',
  'Leadership', 'Communication', 'Problem Solving', 'Team Management', 'Agile', 'Scrum'
];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, min, max) {
  const count = Math.min(randomInt(min, max), arr.length);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateEducation(personId) {
  const count = randomInt(1, 3);
  const educations = [];
  for (let i = 0; i < count; i++) {
    educations.push({
      id: `edu_${personId}_${i}`,
      degree: randomFromArray(DEGREES),
      field: randomFromArray(FIELDS),
      institution: randomFromArray(INSTITUTIONS),
      graduation_year: randomInt(2000, 2024)
    });
  }
  return educations;
}

function generateExperiences(personId, workingYears, forcedRole = null) {
  const count = randomInt(1, Math.min(5, Math.max(1, Math.floor(workingYears / 2))));
  const experiences = [];
  const usedCompanies = new Set();

  let currentYear = new Date().getFullYear();
  let remainingYears = workingYears;

  for (let i = 0; i < count && remainingYears > 0; i++) {
    let company;
    do { company = randomFromArray(COMPANIES); } while (usedCompanies.has(company));

    usedCompanies.add(company);
    const duration = i === count - 1 ? remainingYears : randomInt(1, Math.min(4, remainingYears));
    const startYear = currentYear - duration;

    let role = (i === 0 && forcedRole) ? forcedRole : randomFromArray(JOB_TITLES);

    experiences.push({
      id: `exp_${personId}_${i}`,
      company: company,
      role: role,
      start_date: `${startYear}-01-01`,
      end_date: i === 0 ? null : `${currentYear}-01-01`,
      description: faker.lorem.sentences(2).replace(/"/g, "'")
    });

    currentYear = startYear;
    remainingYears -= duration;
  }
  return experiences;
}

function generatePerson(index, forcedProfile = null) {
  const id = `person_${String(index).padStart(4, '0')}`;
  const firstName = faker.person.firstName();
  const lastName = randomFromArray(INDO_SURNAMES);

  const workingYears = forcedProfile ? randomInt(forcedProfile.minExp, forcedProfile.minExp + 10) : randomInt(0, 25);

  const person = {
    id: id,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@gmail.com`,
    phone: faker.phone.number('+62 8## #### ####'),
    birth_date: faker.date.between({ from: '1960-01-01', to: '1995-01-01' }).toISOString().split('T')[0],
    working_years: workingYears
  };

  let skills = [];
  if (forcedProfile) {
    // Add all required skills for this role
    skills = forcedProfile.skills.map((s, i) => ({ id: `skill_${id}_f_${i}`, name: s, category: 'Technical' }));
    // Add some random baseline skills
    const extra = randomSubset(ALL_SKILLS, 2, 5);
    extra.forEach((es, i) => {
      if (!skills.find(s => s.name === es)) {
        skills.push({ id: `skill_${id}_e_${i}`, name: es, category: 'General' });
      }
    });
  } else {
    skills = randomSubset(ALL_SKILLS, 3, 10).map((s, i) => ({ id: `skill_${id}_r_${i}`, name: s, category: 'General' }));
  }

  return {
    person,
    education: generateEducation(id),
    certificates: [],
    trainings: [],
    experiences: generateExperiences(id, workingYears, forcedProfile ? forcedProfile.title : null),
    social_media: [],
    skills: skills
  };
}

// Generate the data
const people = [];

// 1. Generate 20 of each targeted role (200 people total)
let counter = 1;
TARGET_ROLES.forEach(role => {
  for (let i = 0; i < 20; i++) {
    people.push(generatePerson(counter++, role));
  }
});

// 2. Generate 300 random people (Total 500)
for (let i = 0; i < 300; i++) {
  people.push(generatePerson(counter++));
}

const data = {
  generated_at: new Date().toISOString(),
  total_people: people.length,
  people: people,
  statistics: { total_skills: people.reduce((acc, p) => acc + p.skills.length, 0) }
};

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'people.json'), JSON.stringify(data, null, 2));
console.log(`✅ Generated ${data.total_people} people with specialized roles.`);
