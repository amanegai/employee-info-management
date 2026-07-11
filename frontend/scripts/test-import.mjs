import { readFileSync, writeFileSync } from 'fs';
import { parseResumeXlsxToForm } from '../src/utils/resumeImport.js';
import { formToSavePayload } from '../src/utils.js';

const buf = readFileSync('c:/zk/会社/社員履歴/【BTC】技術者履歴書_蘇.xlsx');
const file = new File([buf], 'test.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});
const form = await parseResumeXlsxToForm(file);
const payload = formToSavePayload({ ...form, employeeCode: 'TEST001' });
console.log('technicalSkills', payload.technicalSkills?.length);
console.log('careers', payload.careers?.length);
console.log('careers with start', payload.careers?.filter(c=>c.startDate).length);
payload.careers?.forEach((c,i)=>console.log(i, c.startDate, (c.roleOverview||'').slice(0,25)));
console.log('personal furigana', payload.personal?.furigana);
console.log('ja read/write', payload.personal?.japaneseReading, payload.personal?.japaneseWriting);
console.log('en read/write', payload.personal?.englishReading, payload.personal?.englishWriting);
console.log('personal specialtyDev', payload.personal?.specialtyDev?.slice?.(0, 40));
console.log('qualifications', payload.qualifications?.length);
console.log('sample skill', payload.technicalSkills?.[0]);
writeFileSync(new URL('./test-payload.json', import.meta.url), JSON.stringify(payload, null, 2));
