const fs = require('fs');

const enJson = JSON.parse(fs.readFileSync('./messages/en.json', 'utf8'));
const ptJson = JSON.parse(fs.readFileSync('./messages/pt.json', 'utf8'));
const esJson = JSON.parse(fs.readFileSync('./messages/es.json', 'utf8'));

function checkKeyExists(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    for (const k of keys) {
        if (current === undefined || current[k] === undefined) return false;
        current = current[k];
    }
    return true;
}

const contentPage = fs.readFileSync('./src/app/[locale]/page.tsx', 'utf8');
const contentNav = fs.readFileSync('./src/components/Navigation.tsx', 'utf8');

const regexPage = /t(?:\.rich|\.markup)?\(['\"]([^'\"]+)['\"]/g;
let match;
console.log('--- Missing in HomePage (en.json) ---');
while ((match = regexPage.exec(contentPage)) !== null) {
    const key = match[1];
    if (!checkKeyExists(enJson.HomePage, key)) {
        console.log("en Missing:", key);
    }
    if (!checkKeyExists(ptJson.HomePage, key)) {
        console.log("pt Missing:", key);
    }
    if (!checkKeyExists(esJson.HomePage, key)) {
        console.log("es Missing:", key);
    }
}

console.log('--- Missing in Navigation (en.json) ---');
const regexNav = /t(?:\.rich|\.markup)?\(['\"]([^'\"]+)['\"]/g;
while ((match = regexNav.exec(contentNav)) !== null) {
    const key = match[1];
    if (!checkKeyExists(enJson.Navigation, key)) {
        console.log("en Missing Nav:", key);
    }
    if (!checkKeyExists(ptJson.Navigation, key)) {
        console.log("pt Missing Nav:", key);
    }
    if (!checkKeyExists(esJson.Navigation, key)) {
        console.log("es Missing Nav:", key);
    }
}
