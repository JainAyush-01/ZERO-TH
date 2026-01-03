const validator = require('validator');

const validate = (data)=>{

    const mandatoryFields = ['firstName' , 'emailId' , 'password'];
    const isAllowed = mandatoryFields.every((k)=>Object.keys(data).includes(k));

    if(!isAllowed)
        throw new Error("Fields Are missing");

    if(!validator.isEmail(data.emailId))
        throw new Error("EmailId is Invalid");

    if(!validator.isStrongPassword(data.password))
        throw new Error("Password is Weak");
}

module.exports = validate;
