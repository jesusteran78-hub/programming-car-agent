const fs = require('fs');
const csv = require('csv-parser');
const { format } = require('@fast-csv/format');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const INPUT_FILE = process.argv[2] || 'leads.csv';
const SMS_OUTPUT = 'sms_targets.csv';
const CALL_OUTPUT = 'call_targets.csv';

console.log(`Processing ${INPUT_FILE}...`);

const smsStream = format({ headers: true });
const callStream = format({ headers: true });

const smsFile = fs.createWriteStream(SMS_OUTPUT);
const callFile = fs.createWriteStream(CALL_OUTPUT);

smsStream.pipe(smsFile);
callStream.pipe(callFile);

let stats = {
    total: 0,
    mobile: 0,
    landline: 0,
    invalid: 0
};

fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on('data', (row) => {
        stats.total++;

        // Try to find the phone column (Apollo often names it 'Phone', 'Company Phone', or 'Direct Phone')
        // We grab the first key that looks like a phone number
        let phoneRaw = row['Phone'] || row['Direct Phone'] || row['Company Phone'] || row['phone'] || ''; // Add more keys if needed

        // If not found by name, try to find any value that looks like a phone (simple heuristic)
        if (!phoneRaw) {
            const values = Object.values(row);
            phoneRaw = values.find(v => v && v.match && v.match(/[\d\-\(\) ]{7,}/)) || '';
        }

        if (!phoneRaw) {
            stats.invalid++;
            callStream.write({ ...row, NOTE_VALIDATION: 'NO_PHONE_FOUND' });
            return;
        }

        try {
            // Defaulting to US if no country code provided. You can change 'US' to 'MX', 'CO', etc.
            const number = phoneUtil.parseAndKeepRawInput(phoneRaw, 'US');

            if (!phoneUtil.isValidNumber(number)) {
                stats.invalid++;
                callStream.write({ ...row, NOTE_VALIDATION: 'INVALID_NUMBER' });
                return;
            }

            const type = phoneUtil.getNumberType(number);
            const formatted = phoneUtil.format(number, PNF.E164); // +12125551234

            // Check if Mobile (1) or Fixed Line Mobile (2 - common in some countries)
            if (type === 1 || type === 2) {
                stats.mobile++;
                smsStream.write({ ...row, CLEAN_PHONE: formatted, PHONE_TYPE: 'MOBILE' });
            } else {
                stats.landline++;
                callStream.write({ ...row, CLEAN_PHONE: formatted, PHONE_TYPE: 'LANDLINE/OTHER' });
            }

        } catch (e) {
            stats.invalid++;
            callStream.write({ ...row, NOTE_VALIDATION: 'PARSE_ERROR' });
        }
    })
    .on('end', () => {
        smsStream.end();
        callStream.end();
        console.log('------------------------------------------------');
        console.log('Finished Processing.');
        console.log(`Total Rows: ${stats.total}`);
        console.log(`✅ Mobile (SMS Ready): ${stats.mobile} -> Saved to ${SMS_OUTPUT}`);
        console.log(`☎️  Landline/Other:     ${stats.landline} -> Saved to ${CALL_OUTPUT}`);
        console.log(`❌ Invalid/No Phone:   ${stats.invalid}`);
        console.log('------------------------------------------------');
    });
