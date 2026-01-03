const mongoose = require('mongoose');

async function main(){
    await mongoose.connect(process.env.DB_Connection_Key);
}

module.exports = main;