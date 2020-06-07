const signin = (req, res, db) => {

	const { user, pass } = req.body;

	db.select('email', 'hash').from('login')
	.where('email', '=', user)
	.then(data => {
		if (pass === data[0].hash) {
			res.json(data[0].email)
		} else {
			res.status(400).json('Wrong Credentials')
		}
	}).catch(err => res.status(400).json('Wrong Credentials'))
}

module.exports = {
	signin: signin
}
