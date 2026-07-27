const fs = require('fs');

let content = fs.readFileSync('schema.prisma', 'utf8');

const target = '  balance                   Decimal             @default(0) @db.Decimal(15, 2)';
const replacement = `  balance                   Decimal             @default(0) @db.Decimal(15, 2)
  nature                    AccountNature       @default(DEBIT)
  balanceType               AccountBalanceType  @default(DEBIT)
  openingBalance            Decimal             @default(0) @db.Decimal(15, 2)
  gstApplicability          Boolean             @default(false)
  defaultTaxGroupId         String?
  isActive                  Boolean             @default(true)
  defaultTaxGroup           TaxGroup?           @relation(fields: [defaultTaxGroupId], references: [id])`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
}

const enumsAndModels = `
enum AccountNature {
  DEBIT
  CREDIT
}

enum AccountBalanceType {
  DEBIT
  CREDIT
}

model Country {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  phoneCode String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  states    State[]
  @@map("countries")
}

model State {
  id        String   @id @default(cuid())
  countryId String
  code      String
  name      String
  gstCode   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  country   Country  @relation(fields: [countryId], references: [id], onDelete: Cascade)
  @@unique([countryId, code])
  @@map("states")
}

model Currency {
  id           String   @id @default(cuid())
  code         String   @unique
  name         String
  symbol       String
  exchangeRate Decimal  @default(1.0) @db.Decimal(15, 6)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@map("currencies")
}

model AppModule {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  icon        String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  menus       Menu[]
  @@map("app_modules")
}

model Menu {
  id        String    @id @default(cuid())
  moduleId  String
  parentId  String?
  name      String
  path      String?
  icon      String?
  sortOrder Int       @default(0)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  module    AppModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  parent    Menu?     @relation("MenuHierarchy", fields: [parentId], references: [id])
  children  Menu[]    @relation("MenuHierarchy")
  @@map("menus")
}

model Permission {
  id          String   @id @default(cuid())
  resource    String
  action      String
  description String?
  isSystem    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([resource, action])
  @@map("permissions")
}

model Unit {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("units")
}
`;

if (!content.includes('model Country')) {
    content += enumsAndModels;
}

fs.writeFileSync('schema.prisma', content);
console.log('Schema updated successfully');
