"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const typeorm_1 = require("typeorm");
const fs_1 = require("fs");
const nda_pdf_js_1 = require("../src/mail/templates/nda.pdf.js");
const nda_template_entity_js_1 = require("../src/nda-templates/entities/nda-template.entity.js");
(0, dotenv_1.config)();
const ds = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sinan_dev',
    entities: [(0, path_1.join)(__dirname, '..', 'src', '**', '*.entity.ts')],
    synchronize: false,
    logging: false,
});
async function main() {
    await ds.initialize();
    const template = await ds.getRepository(nda_template_entity_js_1.NdaTemplate).findOne({ where: { isActive: true } });
    if (!template) {
        console.error('No active NDA template found in the database.');
        process.exit(1);
    }
    console.log(`Using template: "${template.name}" (v${template.version})`);
    const buffer = await (0, nda_pdf_js_1.generateNdaPdf)({
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
    const outputDir = (0, path_1.join)(__dirname, '..', 'outputs');
    (0, fs_1.mkdirSync)(outputDir, { recursive: true });
    const outputPath = (0, path_1.join)(outputDir, 'test-nda.pdf');
    (0, fs_1.writeFileSync)(outputPath, buffer);
    console.log(`PDF written to: ${outputPath}`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=test-nda.js.map