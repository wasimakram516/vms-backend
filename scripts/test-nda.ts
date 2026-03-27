import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { writeFileSync, mkdirSync } from 'fs';
import { generateNdaPdf } from '../src/mail/templates/nda.pdf.js';
import { NdaTemplate } from '../src/nda-templates/entities/nda-template.entity.js';

config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'sinan_dev',
  entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
  synchronize: false,
  logging: false,
});

async function main() {
  await ds.initialize();

  const template = await ds.getRepository(NdaTemplate).findOne({ where: { isActive: true } });

  if (!template) {
    console.error('No active NDA template found in the database.');
    process.exit(1);
  }

  console.log(`Using template: "${template.name}" (v${template.version})`);


  const buffer = await generateNdaPdf({
    heading: template.name,
    hostName: 'Ahmed Al-Rashidi',
    visitorFullName: 'John Smith',
    visitorOrganisation: 'Tech Solutions Ltd.',
    visitorIdNumber: 'A-12345678',
    dateOfVisit: '27 March 2026',
    visitTime: '10:30 AM',
    purpose: 'Business Meeting',
    preamble: template.preamble,
    body: template.body,
    visitorRecordTitle: template.visitorRecordTitle ?? undefined,
    visitorRecordNote: template.visitorRecordNote ?? undefined,
    footer: template.footer ?? undefined,
  });

  await ds.destroy();

  const outputDir = join(__dirname, '..', 'outputs');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'test-nda.pdf');
  writeFileSync(outputPath, buffer);
  console.log(`PDF written to: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
