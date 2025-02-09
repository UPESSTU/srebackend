const csvParser = require("csv-parser")
const fs = require('fs')

const Deck = require('../models/deck')
const User = require("../models/user")
const School = require('../models/school')

const logger = require('../utils/logger')


exports.uploadDeck = async (req, res) => {
    try {

        const filePath = req.file.path

        const decks = new Array()


        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', async (row) => {
                try {

                    const evaluator = await User.findOne(
                        {
                            emailAddress: row.evaluatorEmail
                        }
                    )
                    const school = await School.findOne(
                        {
                            shortName: row.schoolName
                        }
                    )

                    const deck = {
                        examDateTime: Math.floor(new Date(row.examDateTime).getTime() / 1000),
                        programName: row.programName,
                        courseCode: row.courseCode,
                        courseName: row.courseName,
                        school: school._id,
                        evaluator: evaluator._id,
                        packetNumber: row.packetNumber,
                        semester: row.semester,
                        studentCount: row.studentCount,
                        rackNumber: row.rackNumber,
                        numberOfAnswerSheets: row.numberOfAnswerSheets,
                        roomNumber: row.roomNumber
                    }
                    await Deck.create(deck)
                } catch (err) {
                    logger.error(`Error: ${err.message || err.toString()}`)
                }
            })
            .on('end', async () => {

                return res.status(201).json({
                    success: true,
                    message: `Decks were imported!`
                })
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

exports.getDecks = async (req, res) => {
    try {
        const {
            page,
            limit,
        } = req.query


        const options = {
            page: page ? page : 1,
            limit: limit ? limit : 10,
            sort: { schoolName: 1 },
            populate: [
                {
                    path: 'evaluator',
                    select: 'firstName lastName emailAddress sapId' 
                },
                {
                    path: 'school'
                }
            ]        
        }

        const response = await Deck.paginate({}, options)

        res.json({
            success: true,
            message: `Decks Fetched From PAGE:${page ? page : 1}`,
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

exports.getAssingedDecks = async (req, res) => {
    try {

        const user = await User.findOne({ _id: req.auth._id })
        const response = await Deck.find({ evaluatorEmail: user.emailAddress })
        if (response.length === 0)
            return res.status(404).json({
                error: true,
                message: 'cannot find'
            })

        res.json({
            success: true,
            message: `Fetched Assigend!`,
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

exports.getDeckById = async (req, res) => {
    try {

        const {
            deckId
        } = req.params

        const response = await Deck.findOne({ _id: deckId })

        if (!response)
            return res.status(404).json({
                error: true,
                message: `Deck not found`
            })

        res.json({
            success: true,
            message: `Deck Found!`,
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

exports.pickUpDeck = async (req, res) => {
    try {

        const {
            deckId
        } = req.body

        let status

        if(req.auth.user.role === 'FACULTY')
            status = 'PICKED_UP'
        else if(req.auth.user.role === 'MODERATOR' || req.auth.user.role === 'ADMIN')
            status = 'DROPPED'

        if(!status) 
            return res.status(403).json({
                error: true,
                message: 'You are not allowed'
            })

        const response = await Deck.findByIdAndUpdate(
            {
                _id: deckId
            },
            {
                statusOfDeck: status
            },
            {
                new: true
            }
        )
        
        res.json({
            success: true,
            message: `Status Updated To ${status}!`,
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