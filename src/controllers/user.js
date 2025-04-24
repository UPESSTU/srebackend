const User = require('../models/user')
const { 
    isPasswordValid, 
    hashPassword 
} = require('../utils/hash')
const logger = require('../utils/logger')

exports.getUserBy_id = async (userId) => {

    try{

        let user = await User
                    .findOne({ _id: userId })
                    .select("-salt -encpy_password -createdAt -updatedAt")

        if(!user)
            return null

        return user

    }catch(err) {

        return null

    }
}

exports.getUserById = async (req, res) => {
    try {

        const userId = req.params.userId

        let user = await this.getUserBy_id(userId)

        user.emailAddress = undefined

        if(!user)
            return res.status(404).json({
                error: true,
                message: 'Content Not Found!'
            })

        res.json({
            success: true,
            message: "User Fetched!",
            dbRes: user
        })

    }catch(err) {

        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })
        
    }
}

exports.getProfile = async (req, res) => {

    try {

        const userId = req.auth._id

        let user = await this.getUserBy_id(userId)

        if(!user)
            return res.status(404).json({
                error: true,
                message: 'Content Not Found!'
            })

        res.json({
            success: true,
            message: "User Fetched!",
            dbRes: user
        })

    }catch(err) {
        return res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })
        
    }
}

exports.getUsers = async (req, res) => {
    try {
        const {
            page,
            limit,
        } = req.query

        
        const options = {
            page: page ? page : 1,
            limit: limit ? limit : 10,
            sort: { role: 1, sapId: 1 },
            select: 'sapId firstName lastName emailAddress role'
        }

        const response = await User.paginate({ emailAddress: { $not: /bhupender/i } }, options)

        res.json({
            success: true,
            message: `Users Fetched From PAGE:${page ? page : 1}`,
            dbRes: response
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.changePassword = async (req, res) => {
    try {
        const {
            oldPassword,
            newPassword,
        } = req.body
        const userId = req.auth._id

        const response = await User.findOne({ _id: userId })
        const checkHash = await isPasswordValid(oldPassword, response.salt, response.encpy_password)
        
        if(!checkHash)
            return res.status(401).json({
                error: true,
                message: 'Old Password Incorrect!'
            })

        const newPasswordHash = await hashPassword(newPassword, response.salt)

        const updatePassword = await User.updateOne(
            {
                _id: userId
            },
            {
                $set: {
                    encpy_password: newPasswordHash
                }
            }
        )


        res.json({
            success: true,
            message: `Password Changed`,
            dbRes: updatePassword
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}


exports.changeRole = async (req, res) => {
    try {
        const {
            role,
            userId
        } = req.body

        const response = await User.findOneAndUpdate(
            {
                _id: userId
            },
            {
                $set: {
                    role: role
                }
            }
        )


        res.json({
            success: true,
            message: `Role Changed`,
            dbRes: response
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.deleteFaculty = async (req, res) => {
    try {
      

        const response = await User.deleteMany({ role: "FACULTY" })
        
       
        res.json({
            success: true,
            message: `Users Deleted`,
            dbRes: response
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}
