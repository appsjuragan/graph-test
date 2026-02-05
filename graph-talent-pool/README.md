# Talent Pool Dashboard - Modular Architecture

## 📁 Project Structure

```
graph-test/
├── src/
│   ├── server.js              # Main server entry point
│   ├── api/
│   │   ├── handlers.js        # API request handlers
│   │   └── routes.js          # Route dispatcher & static file serving
│   ├── database/
│   │   ├── connection.js      # Database connection manager (singleton)
│   │   └── queries.js         # All Neo4j Cypher queries
│   ├── config/
│   │   ├── database.js        # Database configuration
│   │   └── roles.js           # Role definitions
│   └── dashboard.js           # Legacy monolithic file (deprecated)
├── public/
│   ├── index.html            # Main frontend HTML
│   ├── css/
│   │   └── styles.css        # Application styles
│   └── js/
│       └── app.js            # Frontend JavaScript
├── scripts/
│   ├── generate_people.js    # Generate sample candidates
│   ├── generate_projects.js  # Generate project assignments
│   ├── generate_social_network.js  # Generate connections
│   └── add_project_roles.js  # Add roles to projects
└── package.json

```

## 🚀 Running the Application

### Start Server
```bash
bun run src/server.js
```

The server will start on `http://localhost:3000`

### Development
```bash
# Set environment variables (optional)
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=yourpassword
export PORT=3000

bun run src/server.js
```

## 📋 Module Descriptions

### `src/server.js`
- **Purpose**: Application entry point
- **Features**:
  - HTTP server creation
  - Graceful shutdown handling
  - Global error handling
  - Process signal handling (SIGINT, SIGTERM)

### `src/api/routes.js`
- **Purpose**: Request routing and dispatch
- **Features**:
  - API endpoint routing
  - Static file serving
  - Content type detection
  - 404 handling

### `src/api/handlers.js`
- **Purpose**: API request handlers with business logic
- **Endpoints**:
  - `GET /api/candidates` - Get filtered candidates
  - `GET /api/candidate?id=xxx` - Get candidate profile
  - `GET /api/overlap?ids=xxx,yyy` - Get overlap analysis
  - `GET /api/project?id=xxx` - Get project details
  - `GET /api/roles` - Get role definitions
- **Features**:
  - Input validation
  - Error handling
  - Consistent response format

### `src/database/connection.js`
- **Purpose**: Database connection management
- **Pattern**: Singleton
- **Features**:
  - Single driver instance across application
  - Automatic session management
  - Connection pool optimization
  - Graceful connection closing

### `src/database/queries.js`
- **Purpose**: All Cypher queries and data access layer
- **Functions**:
  - `getCandidates(filters)` - Search and filter candidates
  - `getCandidateProfile(id)` - Get detailed profile
  - `getCandidatesOverlap(ids)` - Analyze overlap between candidates
  - `getProjectDetails(id)` - Get project team information
- **Features**:
  - Parameterized queries (SQL injection safe)
  - Consistent data transformation
  - Error propagation

### `src/config/database.js`
- **Purpose**: Centralized configuration
- **Features**:
  - Environment variable support
  - Default values
  - Type safety

### `src/config/roles.js`
- **Purpose**: Role definitions and criteria
- **Categories**:
  - Specialists (Data Scientist, Software Engineer, etc.)
  - Structural (Unit Head, Dept Head, Division Head)
  - Tech Field (CTO, CIO, IT Gov., SME)

## 🔧 Maintenance Guide

### Adding a New API Endpoint

1. **Add query function** in `src/database/queries.js`:
```javascript
async function getNewData(params) {
    const query = `MATCH (n:Node) WHERE ... RETURN n`;
    const result = await executeQuery(query, params);
    return result.records.map(...);
}
module.exports = { ..., getNewData };
```

2. **Add handler** in `src/api/handlers.js`:
```javascript
async function getNewData(req, res) {
    try {
        const data = await queries.getNewData(req.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    } catch (error) {
        console.error('ERROR:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}
module.exports = { ..., getNewData };
```

3. **Add route** in `src/api/routes.js`:
```javascript
if (pathname === '/api/new-endpoint') {
    return handlers.getNewData({ query: parsedUrl.query }, res);
}
```

### Modifying Database Queries

All queries are in `src/database/queries.js`. To modify:
1. Find the relevant function
2. Update the Cypher query
3. Update data transformation if needed
4. Test with sample data

### Error Handling

Errors propagate through this chain:
1. `queries.js` - Throws error with descriptive message
2. `handlers.js` - Catches error, logs it, returns 500 response
3. Client receives JSON: `{ "error": "descriptive message" }`

### Performance Optimization

1. **Connection Pooling**: Already optimized with singleton pattern
2. **Query Optimization**: Add indexes in Neo4j for frequently queried properties
3. **Caching**: Can add Redis or in-memory cache in `queries.js`
4. **Pagination**: Add SKIP and LIMIT to queries

## 🧪 Testing

### Manual Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/candidates
curl http://localhost:3000/api/candidate?id=person_0001
curl "http://localhost:3000/api/overlap?ids=person_0001,person_0002"
curl http://localhost:3000/api/project?id=proj_0001
```

### Database Testing
```bash
# Generate test data
node scripts/generate_people.js
node scripts/generate_projects.js
node scripts/generate_social_network.js
node scripts/add_project_roles.js
```

## 🔒 Security Considerations

### Current Implementation
- ✅ Parameterized queries (no SQL injection)
- ✅ Error message sanitization
- ✅ Input validation in handlers

### Recommended Additions
- [ ] Rate limiting
- [ ] Authentication/Authorization
- [ ] CORS configuration
- [ ] Request body size limits
- [ ] Input sanitization library (e.g., validator.js)
- [ ] Helmet.js for security headers

## 📊 Monitoring & Logging

### Current Logging
- Server startup/shutdown
- API errors with stack traces
- Uncaught exceptions

### Recommended Additions
- [ ] Request logging middleware
- [ ] Performance metrics (response time)
- [ ] Winston or Pino for structured logging
- [ ] Application metrics (Prometheus)
- [ ] Health check endpoint

## 🚢 Deployment

### Environment Variables
```bash
NEO4J_URI=bolt://production-host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure-password
PORT=3000
NODE_ENV=production
```

### Process Management
```bash
# Using PM2
pm2 start src/server.js --name talent-dashboard
pm2 save
pm2 startup
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

## 📚 Dependencies

- `neo4j-driver` - Neo4j database driver
- `http` - Built-in HTTP server
- `url` - Built-in URL parsing
- `fs` - Built-in file system operations

## 🤝 Contributing

1. Create feature branch
2. Make changes in appropriate modules
3. Test thoroughly
4. Update this README if needed
5. Submit pull request

## 📝 Notes

- The monolithic `src/dashboard.js` is deprecated but kept for reference
- Frontend files should be moved to `public/` directory
- All new features should follow the modular structure
- Keep functions small and focused (Single Responsibility Principle)
