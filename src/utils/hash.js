const crypto = require('crypto')


//Create The Hashed Password
exports.hashPassword = async (password, salt) => {
    //Returns The Hashed Password
    return crypto
            .pbkdf2Sync(
                password,
                salt,
                1000,
                64,
                'SHA512'
            )
            .toString('hex')

}

//Checks For Valid Password 
exports.isPasswordValid = async (password, salt, encpy_password ) => {
    //Returns True Or False
    return await this.hashPassword(password, salt) === encpy_password ? true : false 

}