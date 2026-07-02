const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
const extended = client.$extends({
  query: {
    $allModels: {
      async $allOperations({ query, args }) { return query(args); }
    }
  }
});
console.log("has then:", 'then' in extended);
console.log("typeof then:", typeof extended.then);
