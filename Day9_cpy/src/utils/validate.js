const validator = require('validator');

const validate = (data) => {
    const mandatoryFields = ['firstName', 'emailId', 'password'];
    
    // MAANG FIX: Ensure keys exist AND are not empty strings!
    for (const field of mandatoryFields) {
        if (!data[field] || data[field].toString().trim() === "") {
            throw new Error(`Field ${field} is missing or empty`);
        }
    }

    if (!validator.isEmail(data.emailId)) {
        throw new Error("EmailId is Invalid");
    }

    if (!validator.isStrongPassword(data.password)) {
        throw new Error("Password is Weak. Must contain 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol.");
    }
}

module.exports = validate;