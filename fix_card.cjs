const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const phrase = "インポート記憶ID台帳";
const firstIndex = content.indexOf(phrase);
const secondIndex = content.indexOf(phrase, firstIndex + 1);

if (firstIndex !== -1 && secondIndex !== -1) {
  const blockStart = content.lastIndexOf('            {/* Top overview card */}', firstIndex);
  const blockEnd = content.lastIndexOf('            {/* Top overview card */}', secondIndex);
  
  if (blockStart !== -1 && blockEnd !== -1 && blockStart < blockEnd) {
    console.log(`Deleting corrupted block between ${blockStart} and ${blockEnd}...`);
    content = content.substring(0, blockStart) + content.substring(blockEnd);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Deleted successfully!");
  } else {
    console.log("Could not resolve clean block bounds.");
  }
} else {
  console.log(`Could not find two occurrences of the phrase. Occurrences found: first=${firstIndex}, second=${secondIndex}`);
}
