const jwt = require('jsonwebtoken')
const Users = require('../models/user');
const redisClient = require('../config/redis')

const validateAdmin = async (req , res , next)=>{

    try
        {
            const {token} = req.cookies;
    
            if(!token)
                throw new Error("Token is Not present");
    
            const payload = jwt.verify(token , process.env.JWT_KEY);
    
            const {_id} = payload;
    
            if(!_id)
                throw new Error("Id is missing");
    
            const user = await Users.findOne({_id});
    
            if(!user)
                throw new Error("User Does not exists");
    
            const isBlocked =  await redisClient.exists(`token:${token}`);
    
            if(isBlocked)
                throw new Error("Invalid Token");

            if(payload.role != "admin")
                throw new Error("Invalid Credentials");
    
            req.result = user;
            next();
        }
        catch(err)
        {
            res.status(401).send("Error :" + err);
        }
}

module.exports = validateAdmin;