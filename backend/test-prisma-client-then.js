const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
console.log("has then in PrismaClient:", 'then' in client);
console.log("typeof then in PrismaClient:", typeof client.then);
console.log("has then in prototype:", 'then' in PrismaClient.prototype);
