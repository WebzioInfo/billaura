const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(/provider\s*=\s*"mysql"/, 'provider = "postgresql"');
schema = schema.replace(/@db\.LongText/g, '');
schema = schema.replace(/@db\.TinyInt/g, '');
fs.writeFileSync('prisma/schema.prisma', schema);
