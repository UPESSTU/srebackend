const 
    {expressjwt} = require('express-jwt'),
    fs = require('fs')
    path = require('path')

const PUBLICKEY = fs.readFileSync(
    path.join(
        __dirname,
        '..',
        'keys',
        'public.pem'
    )
)

module.exports = expressjwt({
  secret: PUBLICKEY,
  algorithms: ['RS256'],
  credentialsRequired: true,
  requestProperty: 'auth'
})