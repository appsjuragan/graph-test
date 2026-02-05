const { fakerID_ID: faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================
const TOTAL_REGISTRATIONS = 1000;
const NORMAL_USERS_RATIO = 0.80;          // 80% normal users
const FRAUD_PATTERNS_RATIO = 0.20;        // 20% suspicious patterns

// Product purchase limits
const PRODUCT_LIMITS = {
    DigitalCertificate: { perKTP: 1, perEmail: null },
    DigitalToken: { perKTP: 2, perEmail: null },
    DigitalSign: { perKTP: null, perEmail: 10 },
    DigitalJump: { perKTP: 100, perEmail: 100 }
};

// ============================================================================
// INDONESIAN DATA POOLS
// ============================================================================
const PROVINCES = [
    { code: '31', name: 'DKI Jakarta', cities: [{ code: '01', name: 'Jakarta Selatan' }, { code: '02', name: 'Jakarta Timur' }, { code: '03', name: 'Jakarta Pusat' }, { code: '04', name: 'Jakarta Barat' }, { code: '05', name: 'Jakarta Utara' }] },
    { code: '32', name: 'Jawa Barat', cities: [{ code: '01', name: 'Bandung' }, { code: '02', name: 'Bogor' }, { code: '03', name: 'Bekasi' }, { code: '04', name: 'Depok' }, { code: '05', name: 'Cirebon' }] },
    { code: '33', name: 'Jawa Tengah', cities: [{ code: '01', name: 'Semarang' }, { code: '02', name: 'Solo' }, { code: '03', name: 'Yogyakarta' }, { code: '04', name: 'Magelang' }] },
    { code: '35', name: 'Jawa Timur', cities: [{ code: '01', name: 'Surabaya' }, { code: '02', name: 'Malang' }, { code: '03', name: 'Sidoarjo' }, { code: '04', name: 'Gresik' }] },
    { code: '12', name: 'Sumatera Utara', cities: [{ code: '01', name: 'Medan' }, { code: '02', name: 'Binjai' }, { code: '03', name: 'Deli Serdang' }] },
    { code: '36', name: 'Banten', cities: [{ code: '01', name: 'Tangerang' }, { code: '02', name: 'Tangerang Selatan' }, { code: '03', name: 'Serang' }] },
    { code: '51', name: 'Bali', cities: [{ code: '01', name: 'Denpasar' }, { code: '02', name: 'Badung' }, { code: '03', name: 'Gianyar' }] }
];

const DISTRICTS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

const FIRST_NAMES_MALE = [
    'Budi', 'Agus', 'Andi', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hendra', 'Irwan', 'Joko',
    'Kurniawan', 'Lutfi', 'Muhammad', 'Nugroho', 'Oky', 'Putra', 'Reza', 'Surya', 'Taufik', 'Umar',
    'Wahyu', 'Yoga', 'Zainal', 'Arif', 'Bayu', 'Cahyo', 'Dimas', 'Faisal', 'Galih', 'Hadi',
    'Imam', 'Januar', 'Kevin', 'Lukman', 'Mahendra', 'Nanda', 'Oscar', 'Pandu', 'Rizky', 'Satria'
];

const FIRST_NAMES_FEMALE = [
    'Siti', 'Dewi', 'Ani', 'Sri', 'Rina', 'Lina', 'Yuni', 'Mega', 'Indah', 'Putri',
    'Wulan', 'Ratna', 'Fitri', 'Sari', 'Ayu', 'Dian', 'Eka', 'Fitriani', 'Gita', 'Hana',
    'Intan', 'Julia', 'Kartika', 'Laras', 'Melati', 'Nina', 'Oktavia', 'Pertiwi', 'Qori', 'Rahma',
    'Safitri', 'Tika', 'Utami', 'Vina', 'Widya', 'Yasmin', 'Zahra', 'Bella', 'Citra', 'Diana'
];

const LAST_NAMES = [
    'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Hidayat', 'Sari', 'Utami',
    'Lestari', 'Wulandari', 'Siregar', 'Nasution', 'Batubara', 'Ginting', 'Sembiring',
    'Gunawan', 'Setiawan', 'Budiman', 'Herianto', 'Susanto', 'Purnomo', 'Wibowo',
    'Nugroho', 'Prasetyo', 'Hartono', 'Sasmita', 'Dharmawan', 'Fauzi', 'Hamid', 'Lubis',
    'Harahap', 'Simbolon', 'Siahaan', 'Panjaitan', 'Sitompul', 'Purba', 'Nainggolan',
    'Simanjuntak', 'Manurung', 'Napitupulu', 'Hutapea', 'Aritonang', 'Tampubolon', 'Sirait'
];

const STREET_NAMES = [
    'Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Rasuna Said', 'Jl. Kuningan',
    'Jl. Merdeka', 'Jl. Diponegoro', 'Jl. Ahmad Yani', 'Jl. Soekarno Hatta', 'Jl. Pahlawan',
    'Jl. Veteran', 'Jl. Cendrawasih', 'Jl. Melati', 'Jl. Mawar', 'Jl. Kenanga',
    'Jl. Anggrek', 'Jl. Dahlia', 'Jl. Flamboyan', 'Jl. Teratai', 'Jl. Bougenville'
];

const BANKS = [
    { name: 'Bank Central Asia (BCA)', code: '014' },
    { name: 'Bank Mandiri', code: '008' },
    { name: 'Bank Rakyat Indonesia (BRI)', code: '002' },
    { name: 'Bank Negara Indonesia (BNI)', code: '009' },
    { name: 'Bank CIMB Niaga', code: '022' },
    { name: 'Bank Danamon', code: '011' },
    { name: 'Bank Permata', code: '013' },
    { name: 'Bank OCBC NISP', code: '028' },
    { name: 'Bank Syariah Indonesia (BSI)', code: '451' },
    { name: 'Bank Mega', code: '426' }
];

const COMPANIES = [
    'PT Telkom Indonesia', 'PT Bank Central Asia Tbk', 'PT Astra International',
    'PT Unilever Indonesia', 'PT Indofood Sukses Makmur', 'PT Gudang Garam',
    'PT Sinar Mas', 'PT Garuda Indonesia', 'PT Pertamina', 'PT PLN',
    'Gojek', 'Tokopedia', 'Shopee Indonesia', 'Bukalapak', 'Traveloka',
    'OVO', 'Dana', 'LinkAja', 'Grab Indonesia', 'Blibli',
    'PT Mayora Indah', 'PT Wings Group', 'PT Kalbe Farma', 'PT Sido Muncul',
    'PT XL Axiata', 'PT Indosat Ooredoo', 'PT Smartfren Telecom'
];

const JOB_TITLES = [
    'Software Engineer', 'Data Analyst', 'Marketing Manager', 'Sales Executive',
    'Accountant', 'HR Manager', 'Project Manager', 'Business Analyst',
    'Customer Service', 'Operations Manager', 'Finance Officer', 'IT Support',
    'Product Manager', 'UX Designer', 'Content Writer', 'Digital Marketer',
    'Quality Assurance', 'Supply Chain Manager', 'Procurement Officer', 'Legal Counsel'
];

const SOCIAL_PLATFORMS = ['LinkedIn', 'Instagram', 'Twitter', 'Facebook', 'TikTok'];

const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed'];

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
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

// Normal distribution for social media count (0-5)
function normalDistributionInt(mean, stdDev, min, max) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const result = Math.round(num * stdDev + mean);
    return Math.max(min, Math.min(max, result));
}

// ============================================================================
// KTP NUMBER GENERATOR
// Format: [Province 2][City 2][District 2][DDMMYY][Seq 4]
// For females: DD + 40
// ============================================================================
function generateKTP(birthDate, gender, province, city, district) {
    const day = birthDate.getDate();
    const month = birthDate.getMonth() + 1;
    const year = birthDate.getFullYear() % 100;

    const dayStr = String(gender === 'Female' ? day + 40 : day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year).padStart(2, '0');

    const sequence = String(randomInt(1, 9999)).padStart(4, '0');

    return `${province}${city}${district}${dayStr}${monthStr}${yearStr}${sequence}`;
}

function generateBirthDateFromKTP(ktpNumber) {
    // Extract birthday from KTP
    const dayPart = parseInt(ktpNumber.substring(6, 8));
    const month = parseInt(ktpNumber.substring(8, 10));
    const year = parseInt(ktpNumber.substring(10, 12));

    const day = dayPart > 40 ? dayPart - 40 : dayPart;
    const fullYear = year > 50 ? 1900 + year : 2000 + year;

    return new Date(fullYear, month - 1, day);
}

function getGenderFromKTP(ktpNumber) {
    const dayPart = parseInt(ktpNumber.substring(6, 8));
    return dayPart > 40 ? 'Female' : 'Male';
}

// ============================================================================
// PERSON DATA GENERATOR
// ============================================================================
function generatePerson(id, options = {}) {
    const gender = options.gender || (Math.random() > 0.5 ? 'Male' : 'Female');
    const province = options.province || randomFromArray(PROVINCES);
    const city = options.city || randomFromArray(province.cities);
    const district = options.district || randomFromArray(DISTRICTS);

    // Generate birth date (18-65 years old)
    const minAge = 18, maxAge = 65;
    const today = new Date();
    const birthDate = options.birthDate || new Date(
        today.getFullYear() - randomInt(minAge, maxAge),
        randomInt(0, 11),
        randomInt(1, 28)
    );

    const ktpNumber = options.ktpNumber || generateKTP(birthDate, gender, province.code, city.code, district);

    const firstName = gender === 'Male'
        ? randomFromArray(FIRST_NAMES_MALE)
        : randomFromArray(FIRST_NAMES_FEMALE);
    const lastName = randomFromArray(LAST_NAMES);
    const fullName = options.name || `${firstName} ${lastName}`;

    // Generate 1-3 emails
    const emailCount = options.emailCount || randomInt(1, 3);
    const emails = [];
    for (let i = 0; i < emailCount; i++) {
        const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? randomInt(1, 999) : ''}`;
        emails.push(`${emailBase}@${randomFromArray(EMAIL_DOMAINS)}`);
    }

    // Generate 1-2 phone numbers
    const phoneCount = randomInt(1, 2);
    const phones = [];
    for (let i = 0; i < phoneCount; i++) {
        phones.push({
            number: faker.phone.number('+62 8## #### ####'),
            type: i === 0 ? 'Mobile' : randomFromArray(['Mobile', 'Landline'])
        });
    }

    // Generate address
    const address = {
        province: province.name,
        city: city.name,
        district: `Kecamatan ${randomInt(1, 20)}`,
        postalCode: `${province.code}${randomInt(100, 999)}`,
        street: `${randomFromArray(STREET_NAMES)} No. ${randomInt(1, 200)}`,
        rt_rw: `RT ${String(randomInt(1, 20)).padStart(3, '0')}/RW ${String(randomInt(1, 10)).padStart(3, '0')}`
    };
    address.fullAddress = `${address.street}, ${address.rt_rw}, ${address.district}, ${address.city}, ${address.province} ${address.postalCode}`;

    // Generate 0-3 bank accounts
    const bankCount = randomInt(0, 3);
    const bankAccounts = [];
    const usedBanks = new Set();
    for (let i = 0; i < bankCount; i++) {
        let bank;
        do { bank = randomFromArray(BANKS); } while (usedBanks.has(bank.code));
        usedBanks.add(bank.code);
        bankAccounts.push({
            bankName: bank.name,
            bankCode: bank.code,
            accountNumber: `${bank.code}${String(randomInt(10000000, 99999999))}`,
            accountType: randomFromArray(['Savings', 'Checking', 'Business'])
        });
    }

    // Generate 0-2 work history
    const workCount = randomInt(0, 2);
    const workHistory = [];
    const usedCompanies = new Set();
    let currentYear = today.getFullYear();
    for (let i = 0; i < workCount; i++) {
        let company;
        do { company = randomFromArray(COMPANIES); } while (usedCompanies.has(company));
        usedCompanies.add(company);

        const duration = randomInt(1, 5);
        const startYear = currentYear - duration;
        workHistory.push({
            company: company,
            role: randomFromArray(JOB_TITLES),
            startDate: `${startYear}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
            endDate: i === 0 ? null : `${currentYear}-${String(randomInt(1, 12)).padStart(2, '0')}-01`,
            isCurrent: i === 0
        });
        currentYear = startYear;
    }

    // Generate social media (normal distribution 0-5)
    const socialCount = normalDistributionInt(2, 1.5, 0, 5);
    const socialMedia = [];
    const usedPlatforms = new Set();
    for (let i = 0; i < socialCount; i++) {
        let platform;
        do { platform = randomFromArray(SOCIAL_PLATFORMS); } while (usedPlatforms.has(platform));
        usedPlatforms.add(platform);
        socialMedia.push({
            platform: platform,
            handle: `@${firstName.toLowerCase()}${lastName.toLowerCase()}${randomInt(1, 999)}`,
            followers: randomInt(50, 50000)
        });
    }

    return {
        id: `person_${String(id).padStart(4, '0')}`,
        ktpNumber: ktpNumber,
        name: fullName,
        gender: gender,
        birthDate: birthDate.toISOString().split('T')[0],
        maritalStatus: randomFromArray(MARITAL_STATUS),
        emails: emails,
        phones: phones,
        address: address,
        bankAccounts: bankAccounts,
        workHistory: workHistory,
        socialMedia: socialMedia
    };
}

// ============================================================================
// REGISTRATION GENERATOR
// ============================================================================
function generateRegistration(id, person, email, product, registeredAt) {
    return {
        id: `reg_${String(id).padStart(5, '0')}`,
        personId: person.id,
        ktpNumber: person.ktpNumber,
        email: email,
        productType: product,
        registeredAt: registeredAt || new Date(
            Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000)
        ).toISOString(),
        status: randomFromArray(['Active', 'Pending', 'Expired']),
        ipAddress: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`,
        userAgent: randomFromArray([
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
            'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile'
        ])
    };
}

// ============================================================================
// FRAUD PATTERN GENERATORS
// ============================================================================
function generateSharedKTPFraud(startId, count) {
    const fraudPatterns = [];
    const persons = [];
    const registrations = [];

    for (let i = 0; i < count; i++) {
        // Create one KTP used by multiple "persons" (different emails)
        const basePerson = generatePerson(startId + i * 3);
        const sharedKTP = basePerson.ktpNumber;

        persons.push(basePerson);

        // Create 2-3 additional fake identities using same KTP
        const fakeCount = randomInt(2, 3);
        for (let j = 0; j < fakeCount; j++) {
            const fakePerson = generatePerson(startId + i * 3 + j + 1, {
                ktpNumber: sharedKTP, // Same KTP!
                gender: getGenderFromKTP(sharedKTP),
                birthDate: generateBirthDateFromKTP(sharedKTP)
            });
            persons.push(fakePerson);

            // Each fake person registers for products
            fakePerson.emails.forEach(email => {
                registrations.push(generateRegistration(
                    registrations.length + 1000,
                    fakePerson,
                    email,
                    randomFromArray(Object.keys(PRODUCT_LIMITS))
                ));
            });
        }

        fraudPatterns.push({
            type: 'SHARED_KTP',
            ktpNumber: sharedKTP,
            affectedPersonIds: persons.slice(-fakeCount - 1).map(p => p.id),
            severity: 'HIGH',
            description: `KTP ${sharedKTP} is used by ${fakeCount + 1} different email accounts`
        });
    }

    return { persons, registrations, fraudPatterns };
}

function generateEmailClusterFraud(startId, count) {
    const fraudPatterns = [];
    const persons = [];
    const registrations = [];

    for (let i = 0; i < count; i++) {
        // One person with many emails registering excessive products
        const person = generatePerson(startId + i, { emailCount: randomInt(5, 10) });
        persons.push(person);

        // Register many products across all emails
        person.emails.forEach(email => {
            const productCount = randomInt(3, 8);
            for (let j = 0; j < productCount; j++) {
                registrations.push(generateRegistration(
                    registrations.length + 2000,
                    person,
                    email,
                    randomFromArray(Object.keys(PRODUCT_LIMITS))
                ));
            }
        });

        fraudPatterns.push({
            type: 'EMAIL_CLUSTER',
            personId: person.id,
            emailCount: person.emails.length,
            registrationCount: registrations.filter(r => r.personId === person.id).length,
            severity: 'MEDIUM',
            description: `Person ${person.name} has ${person.emails.length} emails with excessive registrations`
        });
    }

    return { persons, registrations, fraudPatterns };
}

function generateAgentMiddlemanFraud(startId, count) {
    const fraudPatterns = [];
    const persons = [];
    const registrations = [];

    for (let i = 0; i < count; i++) {
        // Agent person who registers on behalf of many clients
        const agent = generatePerson(startId + i);
        agent.isAgent = true;
        agent.agentCompany = `PT ${randomFromArray(['Digital', 'Teknologi', 'Solusi', 'Prima', 'Mitra'])} ${randomFromArray(['Mandiri', 'Sejahtera', 'Utama', 'Jaya', 'Abadi'])}`;
        persons.push(agent);

        // Agent registers products for multiple "clients"
        const clientCount = randomInt(10, 30);
        for (let j = 0; j < clientCount; j++) {
            registrations.push(generateRegistration(
                registrations.length + 3000,
                agent,
                agent.emails[0],
                randomFromArray(['DigitalCertificate', 'DigitalToken']),
                // Clustered registration times (within hours)
                new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000 + randomInt(0, 3) * 60 * 60 * 1000).toISOString()
            ));
        }

        fraudPatterns.push({
            type: 'AGENT_MIDDLEMAN',
            personId: agent.id,
            agentCompany: agent.agentCompany,
            registrationCount: clientCount,
            severity: 'LOW',
            description: `${agent.name} acts as agent for ${agent.agentCompany}, registering ${clientCount} products`
        });
    }

    return { persons, registrations, fraudPatterns };
}

function generatePolicyViolationFraud(startId, count) {
    const fraudPatterns = [];
    const persons = [];
    const registrations = [];

    for (let i = 0; i < count; i++) {
        const person = generatePerson(startId + i);
        persons.push(person);

        const violations = [];

        // Violate DigitalCertificate limit (should be 1 per KTP)
        const certCount = randomInt(2, 5);
        for (let j = 0; j < certCount; j++) {
            registrations.push(generateRegistration(
                registrations.length + 4000,
                person,
                person.emails[j % person.emails.length],
                'DigitalCertificate'
            ));
        }
        violations.push(`DigitalCertificate: ${certCount}/${PRODUCT_LIMITS.DigitalCertificate.perKTP} per KTP`);

        // Violate DigitalToken limit (should be max 2 per KTP)
        const tokenCount = randomInt(3, 6);
        for (let j = 0; j < tokenCount; j++) {
            registrations.push(generateRegistration(
                registrations.length + 4000,
                person,
                person.emails[j % person.emails.length],
                'DigitalToken'
            ));
        }
        violations.push(`DigitalToken: ${tokenCount}/${PRODUCT_LIMITS.DigitalToken.perKTP} per KTP`);

        fraudPatterns.push({
            type: 'POLICY_VIOLATION',
            personId: person.id,
            ktpNumber: person.ktpNumber,
            violations: violations,
            severity: 'HIGH',
            description: `${person.name} violated product purchase limits: ${violations.join(', ')}`
        });
    }

    return { persons, registrations, fraudPatterns };
}

// ============================================================================
// NORMAL USER GENERATOR
// ============================================================================
function generateNormalUsers(startId, count) {
    const persons = [];
    const registrations = [];

    for (let i = 0; i < count; i++) {
        const person = generatePerson(startId + i);
        persons.push(person);

        // Normal users register 1-3 products within limits
        const regCount = randomInt(1, 3);
        const products = randomSubset(Object.keys(PRODUCT_LIMITS), regCount, regCount);

        products.forEach(product => {
            registrations.push(generateRegistration(
                registrations.length + 5000,
                person,
                person.emails[0],
                product
            ));
        });
    }

    return { persons, registrations };
}

// ============================================================================
// MAIN DATA GENERATION
// ============================================================================
function generateAllData() {
    console.log('🚀 Starting fraud analytics data generation...\n');

    const normalCount = Math.floor(TOTAL_REGISTRATIONS * NORMAL_USERS_RATIO);
    const fraudCount = TOTAL_REGISTRATIONS - normalCount;
    const fraudPerType = Math.floor(fraudCount / 4);

    let personId = 1;
    let allPersons = [];
    let allRegistrations = [];
    let allFraudPatterns = [];

    // Generate normal users
    console.log(`👥 Generating ${normalCount} normal users...`);
    const normal = generateNormalUsers(personId, normalCount);
    allPersons = allPersons.concat(normal.persons);
    allRegistrations = allRegistrations.concat(normal.registrations);
    personId += normalCount;

    // Generate fraud patterns
    console.log(`🔴 Generating ${fraudPerType} shared KTP fraud patterns...`);
    const sharedKTP = generateSharedKTPFraud(personId, fraudPerType);
    allPersons = allPersons.concat(sharedKTP.persons);
    allRegistrations = allRegistrations.concat(sharedKTP.registrations);
    allFraudPatterns = allFraudPatterns.concat(sharedKTP.fraudPatterns);
    personId += sharedKTP.persons.length;

    console.log(`🟠 Generating ${fraudPerType} email cluster fraud patterns...`);
    const emailCluster = generateEmailClusterFraud(personId, fraudPerType);
    allPersons = allPersons.concat(emailCluster.persons);
    allRegistrations = allRegistrations.concat(emailCluster.registrations);
    allFraudPatterns = allFraudPatterns.concat(emailCluster.fraudPatterns);
    personId += emailCluster.persons.length;

    console.log(`🟡 Generating ${fraudPerType} agent/middleman patterns...`);
    const agent = generateAgentMiddlemanFraud(personId, fraudPerType);
    allPersons = allPersons.concat(agent.persons);
    allRegistrations = allRegistrations.concat(agent.registrations);
    allFraudPatterns = allFraudPatterns.concat(agent.fraudPatterns);
    personId += agent.persons.length;

    console.log(`🔵 Generating ${fraudPerType} policy violation patterns...`);
    const policyViolation = generatePolicyViolationFraud(personId, fraudPerType);
    allPersons = allPersons.concat(policyViolation.persons);
    allRegistrations = allRegistrations.concat(policyViolation.registrations);
    allFraudPatterns = allFraudPatterns.concat(policyViolation.fraudPatterns);

    // Compile final data
    const data = {
        generatedAt: new Date().toISOString(),
        statistics: {
            totalPersons: allPersons.length,
            totalRegistrations: allRegistrations.length,
            totalFraudPatterns: allFraudPatterns.length,
            fraudBreakdown: {
                sharedKTP: sharedKTP.fraudPatterns.length,
                emailCluster: emailCluster.fraudPatterns.length,
                agentMiddleman: agent.fraudPatterns.length,
                policyViolation: policyViolation.fraudPatterns.length
            }
        },
        productLimits: PRODUCT_LIMITS,
        persons: allPersons,
        registrations: allRegistrations,
        fraudPatterns: allFraudPatterns
    };

    // Save to file
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'registrations.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log('\n✅ Data generation complete!');
    console.log('📊 Statistics:');
    console.log(`   Total Persons: ${data.statistics.totalPersons}`);
    console.log(`   Total Registrations: ${data.statistics.totalRegistrations}`);
    console.log(`   Total Fraud Patterns: ${data.statistics.totalFraudPatterns}`);
    console.log('\n📁 Fraud Breakdown:');
    console.log(`   Shared KTP: ${data.statistics.fraudBreakdown.sharedKTP}`);
    console.log(`   Email Cluster: ${data.statistics.fraudBreakdown.emailCluster}`);
    console.log(`   Agent/Middleman: ${data.statistics.fraudBreakdown.agentMiddleman}`);
    console.log(`   Policy Violation: ${data.statistics.fraudBreakdown.policyViolation}`);
    console.log(`\n💾 Data saved to: ${outputPath}`);
}

generateAllData();
