const fs = require('fs');
const readline = require('readline');

const logFilePath = 'logs.json'; 

const lineReader = readline.createInterface({
  input: fs.createReadStream(logFilePath),
});

lineReader.on('line', (line) => {
  try {
    const logEntry = JSON.parse(line);
    console.log(logEntry);
  } catch (error) {
    console.error(`Error parsing log entry: ${error}`);
  }
});
