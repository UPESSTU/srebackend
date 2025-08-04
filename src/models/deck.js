const {
    Schema,
    model
} = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const deckSchema = new Schema({

    examDate: {
        type: Number,
        requried: true
    },
    programName: {
        type: String,
        required: true
    },
    courseCode: {
        type: String,
        required: true
    },
    courseName: {
        type: String,
        requried: true
    },
    school: {
        type: String,
        required: true
    },
    evaluator: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },
    packetNumber: {
        type: String,
        required: true,
        unique: true,
    },
    roomNumber: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    studentCount: {
        type: Number,
        required: true
    },
    rackNumber: {
        type: String,
        
    },
    numberOfAnswerSheets: {
        type: Number,
        default: 0
    },
    statusOfDeck: {
        type: String,
        enum: ['PENDING', 'PICKED_UP', 'DROPPED'],
        default: 'PENDING'
    },
    qrCodeString: {
        type: String,
        unique: true,
        required: true
    },
    cohort: {
        type: String
    },
    pickUpTimestamp: {
        type: Number
    },
    dropTimestamp: {
        type: Number
    },
    shiftOfExam: {
        type: String,
        enums: ['MORNING', 'EVENING']
    }
}, { timestamps: true })

deckSchema.plugin(mongoosePaginate)

const Deck = model('Deck', deckSchema)


module.exports = Deck