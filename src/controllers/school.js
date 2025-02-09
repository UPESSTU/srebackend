const School = require('../models/school')
const logger = require('../utils/logger')


exports.addSchool = async (req, res) => {
    try {

        const {
            schoolName,
            shortName
        } = req.body

        const school = new School({
            schoolName: schoolName,
            shortName: shortName
        })
        
        const response = await school.save()

        res.status(201).json({
            message: 'School Created',
            success: true,
            dbRes: response
        })
       
    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })

    }
}

exports.getSchools = async (req, res) => {
    try {

        const response = await School.find()

        res.status(201).json({
            message: 'Schools Fetched',
            success: true,
            dbRes: response
        })
       
    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })

    }
}

exports.getSchoolById = async (req, res) => {
    try {

        const {
            schoolId
        } = req.body
       
        const response = await School.findOne({ _id: schoolId })

        res.status(201).json({
            message: 'School Feteched',
            success: true,
            dbRes: response
        })
       
    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })

    }
}