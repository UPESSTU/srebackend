const {
    Schema,
    model
} = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const deckSchema = new Schema({

    examDateTime: {
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
        type: Schema.ObjectId,
        ref: 'School',
        required: true
    },
    evaluator: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
    },
    packetNumber: {
        type: Number,
        required: true
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
        type: Number,
        required: true
    },
    numberOfAnswerSheets: {
        type: Number,
        required: true
    },
    statusOfDeck: {
        type: String,
        enum: ['PENDING', 'PICKED_UP', 'EVALUATED'],
        default: 'PENDING'
    }
}, { timestamps: true })

deckSchema.plugin(mongoosePaginate)

const Deck = model('Deck', deckSchema)


module.exports = Deck